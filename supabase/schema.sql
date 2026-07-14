-- ============================================================
-- Good Embroidery — Finance Tracker schema
-- รันไฟล์นี้ใน Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- รายจ่าย ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('fixed','goods','shipping','credit_dad','credit_beam','labor_child','house','water','electric','other')),
  date date not null,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- รายรับ (วางบิล) ----------
create table if not exists income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_date date not null,
  company text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','transferred')),
  created_at timestamptz not null default now()
);

-- ---------- เป้าหมายรายเดือน ----------
create table if not exists targets (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null, -- format: 'YYYY-MM'
  amount numeric(12,2) not null check (amount > 0),
  primary key (user_id, month_key)
);

-- ---------- indexes ----------
create index if not exists idx_expenses_user_date on expenses(user_id, date);
create index if not exists idx_income_user_date on income(user_id, bill_date);

-- ============================================================
-- Row Level Security — แต่ละบัญชีเห็นเฉพาะข้อมูลของตัวเอง
-- ============================================================
alter table expenses enable row level security;
alter table income enable row level security;
alter table targets enable row level security;

create policy "expenses_select_own" on expenses for select using (auth.uid() = user_id);
create policy "expenses_insert_own" on expenses for insert with check (auth.uid() = user_id);
create policy "expenses_update_own" on expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_delete_own" on expenses for delete using (auth.uid() = user_id);

create policy "income_select_own" on income for select using (auth.uid() = user_id);
create policy "income_insert_own" on income for insert with check (auth.uid() = user_id);
create policy "income_update_own" on income for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "income_delete_own" on income for delete using (auth.uid() = user_id);

create policy "targets_select_own" on targets for select using (auth.uid() = user_id);
create policy "targets_insert_own" on targets for insert with check (auth.uid() = user_id);
create policy "targets_update_own" on targets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "targets_delete_own" on targets for delete using (auth.uid() = user_id);

-- ============================================================
-- อัปเดตหมวดรายจ่าย — รันบล็อกนี้ถ้าเคยรัน schema.sql ไปแล้วก่อนหน้านี้
-- (ถ้าเป็นฐานข้อมูลใหม่ที่ยังไม่เคยรัน ข้ามส่วนนี้ได้เลย เพราะ create table
-- ด้านบนใช้ constraint ใหม่อยู่แล้ว)
-- ============================================================
alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in ('fixed','goods','shipping','credit_dad','credit_beam','labor_child','house','water','electric','other'));
