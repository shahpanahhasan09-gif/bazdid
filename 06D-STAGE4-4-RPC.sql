-- ============================================================
-- مرحله ۴.۴ — توابع امن برای فهرست، ارسال و تغییر وضعیت ارجاع
-- قبل از آپلود نسخه‌ی ۹ صفحه اجرا شود. فقط یک بار.
-- ============================================================

-- ۱. فهرست ارجاع‌های مربوط به کاربر (همان قاعده‌ی سیاست ref_read)
create or replace function public.list_referrals()
returns setof public.referrals
language sql stable security definer set search_path = public as $$
  select r.* from public.referrals r
  where public.is_platform_admin()
     or r.from_org_id in (select public.my_org_ids())
     or r.to_org_id in (select public.my_org_ids())
  order by r.created_at desc;
$$;

-- ۲. ارسال ارجاع (فقط اگر نقش ارجاع در سازمان مبدأ داشته باشد)
create or replace function public.send_referral(p_from uuid, p_to uuid, p_kind text, p_note text)
returns public.referrals
language plpgsql security definer set search_path = public as $$
declare r public.referrals;
begin
  if not public.can_refer_in(p_from) then
    raise exception 'این حساب در سازمان مبدأ اجازه‌ی ارجاع ندارد';
  end if;
  insert into public.referrals (from_org_id, to_org_id, kind, note)
  values (p_from, p_to, p_kind, p_note)
  returning * into r;
  return r;
end $$;

-- ۳. تغییر وضعیت (قواعد دقیق را تریگر referrals_guard کنترل می‌کند)
create or replace function public.update_referral(p_id uuid, p_status text, p_reply text)
returns public.referrals
language plpgsql security definer set search_path = public as $$
declare r public.referrals;
begin
  update public.referrals
     set status = p_status,
         reply_note = coalesce(p_reply, reply_note)
   where id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'ارجاع پیدا نشد';
  end if;
  return r;
end $$;

-- ۴. دسترسی: فقط کاربران واردشده
revoke all on function public.list_referrals() from public, anon;
revoke all on function public.send_referral(uuid, uuid, text, text) from public, anon;
revoke all on function public.update_referral(uuid, text, text) from public, anon;
grant execute on function public.list_referrals() to authenticated;
grant execute on function public.send_referral(uuid, uuid, text, text) to authenticated;
grant execute on function public.update_referral(uuid, text, text) to authenticated;

-- ۵. بستن دسترسی مستقیم ناشناس به جدول ارجاع
revoke all on public.referrals from anon;
