import { supabase } from './supabase';
import { ensurePublicUser } from './users';
import type { RoutineStep, RoutineType } from '../types/routine';

export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ROUTINE_NAMES: Record<RoutineType, string> = {
  AM: 'Sabah Rutini',
  PM: 'Akşam Rutini',
};

export async function getRoutine(userId: string, type: RoutineType) {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;

  return {
    ...row,
    steps: (row.steps as RoutineStep[]) ?? [],
  };
}

export async function createRoutine(userId: string, type: RoutineType) {
  const { data, error } = await supabase
    .from('routines')
    .insert({
      user_id: userId,
      type,
      name: ROUTINE_NAMES[type],
      steps: [],
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, steps: (data.steps as RoutineStep[]) ?? [] };
}

export async function getOrCreateRoutine(
  userId: string,
  type: RoutineType,
  email?: string
) {
  if (email) await ensurePublicUser(userId, email);
  let routine = await getRoutine(userId, type);
  if (!routine) {
    routine = await createRoutine(userId, type);
  }
  return routine;
}

export async function updateRoutineSteps(
  routineId: string,
  steps: RoutineStep[]
) {
  const { data, error } = await supabase
    .from('routines')
    .update({ steps, updated_at: new Date().toISOString() })
    .eq('id', routineId)
    .select()
    .single();

  if (error) throw error;
  return { ...data, steps: (data.steps as RoutineStep[]) ?? [] };
}

export async function addStepToRoutine(
  routineId: string,
  step: Omit<RoutineStep, 'id'>
) {
  const { data: routine } = await supabase
    .from('routines')
    .select('steps')
    .eq('id', routineId)
    .single();

  const currentSteps = (routine?.steps as RoutineStep[]) ?? [];
  const newStep: RoutineStep = {
    ...step,
    id: generateUuid(),
    order: currentSteps.length,
  };
  const newSteps = [...currentSteps, newStep];

  return updateRoutineSteps(routineId, newSteps);
}

export async function updateStepInRoutine(
  routineId: string,
  stepId: string,
  updates: Partial<Omit<RoutineStep, 'id' | 'order'>>
) {
  const { data: routine } = await supabase
    .from('routines')
    .select('steps')
    .eq('id', routineId)
    .single();

  const steps = (routine?.steps as RoutineStep[]) ?? [];
  const index = steps.findIndex((s) => s.id === stepId);
  if (index === -1) return null;

  const newSteps = [...steps];
  newSteps[index] = { ...newSteps[index], ...updates };
  return updateRoutineSteps(routineId, newSteps);
}

export async function removeStepFromRoutine(routineId: string, stepId: string) {
  const { data: routine } = await supabase
    .from('routines')
    .select('steps')
    .eq('id', routineId)
    .single();

  const steps = (routine?.steps as RoutineStep[]) ?? [];
  const newSteps = steps
    .filter((s) => s.id !== stepId)
    .map((s, i) => ({ ...s, order: i }));
  return updateRoutineSteps(routineId, newSteps);
}

export async function reorderRoutineSteps(
  routineId: string,
  stepIds: string[]
) {
  const { data: routine } = await supabase
    .from('routines')
    .select('steps')
    .eq('id', routineId)
    .single();

  const steps = (routine?.steps as RoutineStep[]) ?? [];
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const newSteps = stepIds
    .map((id) => stepMap.get(id))
    .filter(Boolean) as RoutineStep[];
  newSteps.forEach((s, i) => (s.order = i));
  return updateRoutineSteps(routineId, newSteps);
}
