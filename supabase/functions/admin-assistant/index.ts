import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!).auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (!roleData) throw new Error('Admin access required');

    const { message, conversationHistory, action } = await req.json();

    // If action is a confirmed DB operation
    if (action) {
      const result = await executeAction(supabase, action);
      return new Response(
        JSON.stringify({ response: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gather app context
    const context = await gatherAppContext(supabase);

    const systemPrompt = `Tu es l'Assistant Lune 🌙, un assistant IA professionnel et expert dédié exclusivement à l'administrateur de l'application "Dini Bismillah" — une plateforme éducative d'apprentissage de l'arabe et de l'éducation islamique.

## TON RÔLE
- Tu assistes l'admin dans TOUTES les tâches de gestion de l'application
- Tu as accès à toutes les données de l'application via la base de données
- Tu es précis, fiable et tu ne devines JAMAIS — si tu ne sais pas, tu le dis clairement
- Tu demandes TOUJOURS confirmation avant toute action destructive (suppression, modification majeure)
- Toutes tes réponses doivent être sourcées (données de l'app ou recherche web)

## CONTEXTE DE L'APPLICATION
${context}

## TES CAPACITÉS
1. **Consulter les données** : élèves, progression, modules, sourates, invocations, nourania, ramadan, présence, classement, messages
2. **Proposer des actions** : quand l'admin demande une modification, tu proposes l'action avec les détails et tu attends sa confirmation
3. **Générer du contenu** : quiz, questions, résumés pédagogiques
4. **Analyser** : statistiques, progression des élèves, engagement
5. **Rechercher** : répondre à des questions éducatives islamiques sourcées

## ACTIONS DISPONIBLES (à proposer, jamais à exécuter sans confirmation)
Pour proposer une action, utilise ce format :
\`\`\`action
{"type": "TYPE_ACTION", "params": {...}, "description": "Description lisible"}
\`\`\`

Types d'actions :
- \`toggle_module\` : activer/désactiver un module (params: module_id, is_active)
- \`send_notification\` : envoyer une notification (params: title, body, type)
- \`update_profile\` : modifier un profil élève (params: user_id, fields)
- \`approve_user\` : approuver un utilisateur (params: user_id)
- \`delete_record\` : supprimer un enregistrement (params: table, id)
- \`export_data\` : exporter des données (params: table, filters)
- \`create_quiz\` : créer un quiz ramadan (params: day_id, questions)
- \`unlock_day\` : débloquer un jour ramadan (params: day_id)

## RÈGLES STRICTES
1. Ne JAMAIS inventer de données — utilise uniquement le contexte fourni
2. Ne JAMAIS exécuter une action sans que l'admin confirme
3. Toujours être professionnel et concis
4. Utiliser des emojis avec parcimonie (🌙 pour t'identifier)
5. Si une info manque, demande à l'admin de préciser
6. Réponds en français`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).map((m: any) => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ response: '🌙 Trop de requêtes, réessayez dans quelques instants.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ response: '🌙 Crédits IA épuisés. Veuillez recharger.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI error:', response.status, errText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) throw new Error('No response from AI');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin assistant error:', error);
    return new Response(
      JSON.stringify({ response: `🌙 Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function gatherAppContext(supabase: any): Promise<string> {
  const sections: string[] = [];

  try {
    // Users stats
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: approvedUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', true);
    const { count: pendingUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false);
    sections.push(`📊 UTILISATEURS: ${totalUsers || 0} total, ${approvedUsers || 0} approuvés, ${pendingUsers || 0} en attente`);

    // Recent profiles (last 5)
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('full_name, email, is_approved, created_at, prayer_group')
      .order('created_at', { ascending: false })
      .limit(5);
    if (recentProfiles?.length) {
      sections.push(`👥 DERNIERS INSCRITS: ${recentProfiles.map((p: any) => `${p.full_name || p.email} (${p.is_approved ? '✅' : '⏳'})`).join(', ')}`);
    }

    // Modules
    const { data: modules } = await supabase.from('learning_modules').select('title, is_active, display_order').order('display_order');
    if (modules?.length) {
      sections.push(`📚 MODULES: ${modules.map((m: any) => `${m.title} (${m.is_active ? 'actif' : 'inactif'})`).join(', ')}`);
    }

    // Sourates count
    const { count: souratesCount } = await supabase.from('sourates').select('*', { count: 'exact', head: true });
    sections.push(`📖 SOURATES: ${souratesCount || 0} sourates`);

    // Invocations count
    const { count: invocationsCount } = await supabase.from('invocations').select('*', { count: 'exact', head: true });
    sections.push(`🤲 INVOCATIONS: ${invocationsCount || 0} invocations`);

    // Nourania lessons
    const { count: nouraniaCount } = await supabase.from('nourania_lessons').select('*', { count: 'exact', head: true });
    sections.push(`📗 NOURANIA: ${nouraniaCount || 0} leçons`);

    // Ramadan days
    const { data: ramadanDays } = await supabase.from('ramadan_days').select('id, day_number, is_unlocked, theme');
    const unlockedDays = ramadanDays?.filter((d: any) => d.is_unlocked)?.length || 0;
    sections.push(`🌙 RAMADAN: ${ramadanDays?.length || 0} jours configurés, ${unlockedDays} débloqués`);

    // Pending validations
    const { count: pendingSourates } = await supabase.from('sourate_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: pendingNourania } = await supabase.from('nourania_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: pendingInvocations } = await supabase.from('invocation_validation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    sections.push(`📋 VALIDATIONS EN ATTENTE: ${pendingSourates || 0} sourates, ${pendingNourania || 0} nourania, ${pendingInvocations || 0} invocations`);

    // Unread messages
    const { count: unreadMessages } = await supabase.from('user_messages').select('*', { count: 'exact', head: true }).eq('is_read', false).eq('sender_type', 'user');
    sections.push(`💬 MESSAGES NON LUS: ${unreadMessages || 0}`);

    // Student groups
    const { data: groups } = await supabase.from('student_groups').select('name').order('name');
    if (groups?.length) {
      sections.push(`👨‍👩‍👧‍👦 GROUPES: ${groups.map((g: any) => g.name).join(', ')}`);
    }

    // Top students
    const { data: topStudents } = await supabase
      .from('student_ranking')
      .select('user_id, total_points')
      .order('total_points', { ascending: false })
      .limit(5);
    if (topStudents?.length) {
      const userIds = topStudents.map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      sections.push(`🏆 TOP ÉLÈVES: ${topStudents.map((s: any) => `${nameMap[s.user_id] || 'Inconnu'} (${s.total_points} pts)`).join(', ')}`);
    }

  } catch (err) {
    console.error('Context gathering error:', err);
    sections.push('⚠️ Certaines données n\'ont pas pu être chargées');
  }

  return sections.join('\n');
}

async function executeAction(supabase: any, action: any): Promise<string> {
  const { type, params } = action;

  try {
    switch (type) {
      case 'toggle_module': {
        const { error } = await supabase
          .from('learning_modules')
          .update({ is_active: params.is_active })
          .eq('id', params.module_id);
        if (error) throw error;
        return `🌙 Module ${params.is_active ? 'activé' : 'désactivé'} avec succès.`;
      }
      case 'approve_user': {
        const { error } = await supabase
          .from('profiles')
          .update({ is_approved: true })
          .eq('user_id', params.user_id);
        if (error) throw error;
        return `🌙 Utilisateur approuvé avec succès.`;
      }
      case 'unlock_day': {
        const { error } = await supabase
          .from('ramadan_days')
          .update({ is_unlocked: true })
          .eq('id', params.day_id);
        if (error) throw error;
        return `🌙 Jour Ramadan débloqué avec succès.`;
      }
      case 'send_notification': {
        // Use edge function to send
        return `🌙 Pour envoyer des notifications, utilisez le panneau Notifications dans l'admin.`;
      }
      case 'create_quiz': {
        if (!params.questions?.length) return '🌙 Aucune question fournie.';
        for (const q of params.questions) {
          const { error } = await supabase.from('ramadan_quizzes').insert({
            day_id: params.day_id,
            question: q.question,
            options: q.options,
            correct_option: q.correct_option,
            explanation: q.explanation || null,
            question_order: q.order || 0,
          });
          if (error) throw error;
        }
        return `🌙 ${params.questions.length} question(s) de quiz créée(s) avec succès.`;
      }
      default:
        return `🌙 Action "${type}" non reconnue.`;
    }
  } catch (err: any) {
    return `🌙 Erreur lors de l'exécution: ${err.message}`;
  }
}
