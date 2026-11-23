// WHERE ARE YOU WORKING? — on a phone: the company (and workspace, …) the
// app's data belongs to, chosen after signing in. A view of useScopeChoice,
// the same picking as the website's page: each level's list, the last choice
// already chosen, a list of one chosen for the person, "Add" for a new one.
//
//   <NativeScopePicker levels={tenancy.levels} onChosen={() => router.replace('/')} />
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Btn, Field, useNativeTheme } from '@xeplr/ui-factory/native'
import { useScopeChoice } from '../useScopeChoice.js'

export function NativeScopePicker({ levels, onChosen, title = 'Where are you working?', lead = 'Everything you see and save next belongs to this choice.' }) {
  const t = useNativeTheme()
  const choice = useScopeChoice({ levels })
  const box = { borderWidth: 1, borderColor: t.border, backgroundColor: t.field, color: t.ink, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, flex: 1 }
  return (
    <ScrollView style={{ backgroundColor: t.plane }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: t.ink, fontSize: 24, fontWeight: '800', marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: t.muted, marginBottom: 20 }}>{lead}</Text>
      {choice.levels.map((level, i) => (
        <View key={level.key} style={{ marginBottom: 20, opacity: level.enabled ? 1 : 0.5 }}>
          <Text style={{ color: t.ink, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>{level.label}</Text>
          {!level.enabled ? <Text style={{ color: t.muted }}>Choose the one above first.</Text> : null}
          {level.enabled && level.items === null && !level.error ? <Text style={{ color: t.muted }}>Loading…</Text> : null}
          {level.error ? <Text style={{ color: t.danger, marginBottom: 8 }} accessibilityRole="alert">{level.error}</Text> : null}
          {level.enabled && level.items ? (
            <>
              {level.items.length === 0 ? <Text style={{ color: t.muted, marginBottom: 8 }}>No {level.noun} yet — add the first one.</Text> : null}
              <View style={{ gap: 8, marginBottom: 10 }}>
                {level.items.map((item) => {
                  const on = Boolean(level.value && level.value.id === item.id)
                  return (
                    <Pressable key={item.id} onPress={() => choice.choose(i, item)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={item.name}
                               style={{ padding: 14, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? t.accent : t.border, backgroundColor: t.surface }}>
                      <Text style={{ color: t.ink, fontSize: 16, fontWeight: on ? '700' : '500' }}>{item.name}</Text>
                    </Pressable>
                  )
                })}
              </View>
              <Field label={'New ' + level.noun}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={box} value={level.adding} onChangeText={(v) => choice.setAdding(i, v)} placeholder={'New ' + level.noun + ' name'}
                             placeholderTextColor={t.muted} accessibilityLabel={'New ' + level.noun + ' name'} />
                  <Btn label="Add" busy={level.busy} disabled={!String(level.adding || '').trim()} onPress={() => choice.add(i)} />
                </View>
              </Field>
            </>
          ) : null}
        </View>
      ))}
      <Btn label="Continue" variant="primary" disabled={!choice.complete} onPress={() => { if (choice.finish() && onChosen) onChosen() }} />
    </ScrollView>
  )
}
