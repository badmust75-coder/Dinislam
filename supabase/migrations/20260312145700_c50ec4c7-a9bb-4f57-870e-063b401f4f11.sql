-- Drop existing policies
DROP POLICY IF EXISTS "Users can send messages" ON user_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON user_messages;
DROP POLICY IF EXISTS "Users can update own received messages" ON user_messages;
DROP POLICY IF EXISTS "admin_can_insert_messages" ON user_messages;
DROP POLICY IF EXISTS "admin_can_read_messages" ON user_messages;
DROP POLICY IF EXISTS "students_can_read_own_messages" ON user_messages;
DROP POLICY IF EXISTS "students_can_insert_messages" ON user_messages;

-- Admin can insert messages
CREATE POLICY "admin_can_insert_messages"
ON user_messages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can read all messages
CREATE POLICY "admin_can_read_messages"
ON user_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin can update all messages (mark as read etc.)
CREATE POLICY "admin_can_update_messages"
ON user_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Students can read their own messages
CREATE POLICY "students_can_read_own_messages"
ON user_messages FOR SELECT TO authenticated
USING (user_id = auth.uid() OR sender_id = auth.uid() OR receiver_id = auth.uid());

-- Students can insert messages (as sender)
CREATE POLICY "students_can_insert_messages"
ON user_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() = sender_id);

-- Students can update own received messages (mark as read)
CREATE POLICY "students_can_update_own_messages"
ON user_messages FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id OR auth.uid() = user_id);