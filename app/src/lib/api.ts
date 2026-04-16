import { supabase } from './supabase'
import type { ProviderId } from './providers'

type ProviderKeyPayload = {
  provider: ProviderId
  apiKey: string
}

type ProviderDeletePayload = {
  provider: ProviderId
}

type ProviderModelsResponse = {
  ok?: boolean
  provider?: ProviderId
  models?: Array<{
    id: string
    name: string
    provider: string
    contextLength?: number
    isFeatured?: boolean
  }>
  note?: string
}

export async function upsertProviderKey(payload: ProviderKeyPayload) {
  const { data, error } = await supabase.functions.invoke('provider-key-upsert', {
    body: payload,
  })

  if (error) {
    throw error
  }

  return data
}

export async function deleteProviderKey(payload: ProviderDeletePayload) {
  const { data, error } = await supabase.functions.invoke('provider-key-delete', {
    body: payload,
  })

  if (error) {
    throw error
  }

  return data
}

export async function validateProviderKey(provider: ProviderId) {
  const { data, error } = await supabase.functions.invoke('provider-key-validate', {
    body: { provider },
  })

  if (error) {
    throw error
  }

  return data
}

// Preset management
export async function createPreset(name: string, content: string) {
  const { data, error } = await supabase
    .from('prompt_presets')
    .insert({
      name,
      prompt: content,
      is_builtin: false,
      is_default: false,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function duplicatePreset(sourceId: string, newName: string) {
  const { data: source, error: fetchError } = await supabase
    .from('prompt_presets')
    .select('prompt')
    .eq('id', sourceId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  return createPreset(newName, source.prompt)
}

export async function renamePreset(presetId: string, newName: string) {
  const { data, error } = await supabase
    .from('prompt_presets')
    .update({ name: newName })
    .eq('id', presetId)
    .eq('is_builtin', false)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deletePreset(presetId: string) {
  const { error } = await supabase
    .from('prompt_presets')
    .delete()
    .eq('id', presetId)
    .eq('is_builtin', false)

  if (error) {
    throw error
  }
}

export async function setActivePreset(presetId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No authenticated user')
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({ active_preset_id: presetId })
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

export async function updateUserNotes(notes: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No authenticated user')
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({ notes })
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

export async function updateTemperature(temperature: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No authenticated user')
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({ active_temperature: temperature })
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

export async function updateActiveProvider(provider: ProviderId) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No authenticated user')
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({ active_provider: provider })
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

export async function updateActiveModel(provider: ProviderId, modelId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No authenticated user')
  }

  const fieldMap = {
    groq: 'active_model_groq',
    deepseek: 'active_model_deepseek',
    openrouter: 'active_model_openrouter',
  }

  const field = fieldMap[provider]
  const { error } = await supabase
    .from('user_preferences')
    .update({ [field]: modelId })
    .eq('user_id', user.id)

  if (error) {
    throw error
  }
}

export async function fetchProviderModels(provider: ProviderId) {
  const { data, error } = await supabase.functions.invoke<ProviderModelsResponse>(`provider-models?provider=${provider}`, {
    method: 'GET',
  })

  if (error) {
    throw error
  }

  return data
}
