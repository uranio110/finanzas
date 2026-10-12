-- Añade el tipo de cuenta "alcancía" (piggy) y los campos para que una
-- plantilla de operación rápida sea un gasto/ingreso fijo recurrente.

alter table accounts drop constraint accounts_type_check;
alter table accounts add constraint accounts_type_check
  check (type in ('cash', 'bank', 'savings', 'card', 'piggy', 'other'));

alter table quick_templates
  add column is_recurring boolean not null default false,
  add column recurrence_day smallint check (recurrence_day between 1 and 31),
  add column last_applied_at date;

comment on column quick_templates.recurrence_day is
  'Día del mes (1-31) en que la plantilla se aplica sola. Si el mes es más '
  'corto que ese día, se aplica el último día del mes.';
comment on column quick_templates.last_applied_at is
  'Última fecha en que se generó automáticamente una transacción desde esta '
  'plantilla. Evita que se duplique si la app se abre varias veces el mismo '
  'mes después del día de recurrencia.';
