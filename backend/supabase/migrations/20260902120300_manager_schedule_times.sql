-- Точные часы смены менеджера (импорт из Excel-графика).
-- До этого хранился только shift_type с фиксированными часами (SHIFT_TIMES).
-- Тип text ("HH:mm") — как в таблице public.shifts.

alter table public.manager_schedule
  add column if not exists start_time text,
  add column if not exists end_time   text;

-- Заполнить существующие строки часами по умолчанию для их типа.
update public.manager_schedule
set start_time = case shift_type
      when 'morning' then '07:00'
      when 'day'     then '13:00'
      when 'evening' then '15:00'
    end,
    end_time = case shift_type
      when 'morning' then '15:00'
      when 'day'     then '21:00'
      when 'evening' then '24:00'
    end
where start_time is null;
