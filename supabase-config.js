// ============================================================
// Supabase 連線設定
// 請依以下步驟填入您的專案資訊：
//
// 1. 前往 https://supabase.com/dashboard
// 2. 選擇您的專案
// 3. 點選左側 Settings → API
// 4. 複製 "Project URL" 填入 SUPABASE_URL
// 5. 複製 "anon public" key 填入 SUPABASE_ANON_KEY
// ============================================================

const SUPABASE_URL = 'https://upqrvczyyzwuugubxibb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uXedn57B0uiKwhAjy7ohyQ_jYaf4c9x';

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
