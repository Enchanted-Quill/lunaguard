
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zepphqayubqtvaranzwa.supabase.co';
const SUPABASE_ANON_KEY = 
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcHBocWF5dWJxdHZhcmFuendhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTIzODUsImV4cCI6MjA3NjcyODM4NX0.FKT6UXoCV1Xbg43cwUNUeoN2p2A72TvtZNsvyrwn8Go';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
