// SIGNING IN ON A PHONE — the server's address (remembered; none when the
// build names one), then whichever ways in the server offers: email +
// password, a code by email, or a code by text to the verified mobile number;
// and the second step when the server asks one (the authenticator app's code,
// or one by email / text — "email me a code instead" always there). The same
// sign-in as the website's LoginForm, drawn with @xeplr/ui-factory/native's
// parts so it looks like every other screen of the app.
//
//   <NativeSignIn title="Rental Desk" tagline="…" logo={require('./logo.png')}
//                 onSignedIn={() => router.replace('/')} />
//
// No router here: what happens once signed in is the app's (onSignedIn).
import { useEffect, useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { Btn, Field, useNativeTheme } from '@xeplr/ui-factory/native'
import { signIn, signInOptions, sendSignInCode, signInWithCode, sendSecondCode, finishSecondStep, startingServer, useSession } from './session.js'

const WAYS = [
  { key: 'password', method: 'password', label: 'Password' },
  { key: 'email', method: 'email_otp', label: 'Email code' },
  { key: 'mobile', method: 'phone_otp', label: 'Mobile' }
]

const SECOND_SAYS = {
  authenticator: 'Enter the 6-digit code from your authenticator app.',
  email: 'We emailed a code to ',
  sms: 'We texted a code to '
}

export function NativeSignIn({ title, tagline, logo, serverHint = 'e.g. rentals.example.com', onSignedIn }) {
  const t = useNativeTheme()
  const { builtIn } = useSession()
  const [server, setServer] = useState(startingServer())
  const [offered, setOffered] = useState(['password'])
  const [way, setWay] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [second, setSecond] = useState(null)
  const [trust, setTrust] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)
  const box = { borderWidth: 1, borderColor: t.border, backgroundColor: t.field, color: t.ink, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 }

  // Which ways in this server offers — asked again when the address settles.
  useEffect(() => {
    let live = true
    const timer = setTimeout(() => {
      signInOptions(server).then((o) => {
        if (!live) return
        const keys = WAYS.filter((w) => o.methods.indexOf(w.method) !== -1).map((w) => w.key)
        setOffered(keys.length ? keys : ['password'])
        setWay((w) => (keys.indexOf(w) !== -1 ? w : (keys[0] || 'password')))
      })
    }, 500)
    return () => { live = false; clearTimeout(timer) }
  }, [server])

  const step = second ? 'second' : (way !== 'password' && codeSent ? 'code' : 'first')
  const who = () => (way === 'mobile' ? { phoneNumber: phone } : { email })

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      if (err && err.code === 'SIGN_IN_EXPIRED') { setSecond(null); setCodeSent(false); setCode('') }
      setError((err && err.message) || 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  const after = (r) => {
    if (r.secondStep) { setCode(''); setTrust(false); setNote(null); setSecond(r.secondStep); return }
    if (onSignedIn) onSignedIn()
  }

  const go = () => run(async () => {
    if (step === 'second') return after(await finishSecondStep({ server, ticket: second.ticket, method: second.method, code, trustDevice: trust }))
    if (way === 'password') return after(await signIn({ server, email, password }))
    if (step === 'first') {
      await sendSignInCode({ server, ...who() })
      setCodeSent(true)
      setNote(way === 'mobile' ? 'If this number is verified on an account, a code is on its way.' : 'If this address has an account, a code is on its way.')
      return
    }
    return after(await signInWithCode({ server, ...who(), code }))
  })

  const resend = (method) => run(async () => {
    setCode('')
    if (step === 'second') {
      const m = method || second.method
      const sent = await sendSecondCode({ ticket: second.ticket, method: m })
      setSecond({ ...second, method: m, sentTo: sent.sentTo })
      setNote('A new code is on its way to ' + sent.sentTo + '.')
      return
    }
    await sendSignInCode({ server, ...who() })
    setNote('A new code is on its way.')
  })

  const startOver = () => { setSecond(null); setCodeSent(false); setCode(''); setError(null); setNote(null) }
  const chooseWay = (k) => { setWay(k); startOver() }

  const canGo = step === 'first'
    ? (way === 'password' ? email && password : way === 'mobile' ? phone : email)
    : code.replace(/\s/g, '').length >= 6

  const link = (label, onPress) => (
    <Pressable key={label} onPress={onPress} disabled={busy} accessibilityRole="button" hitSlop={8} style={{ paddingVertical: 10 }}>
      <Text style={{ color: t.accent, fontSize: 15 }}>{label}</Text>
    </Pressable>
  )

  const codeBox = (
    <Field label="Code">
      <TextInput style={[box, { fontSize: 22, letterSpacing: 6, textAlign: 'center' }]} value={code} onChangeText={setCode}
        keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={7} autoFocus
        onSubmitEditing={go} accessibilityLabel="Code" />
    </Field>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.plane }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
        {logo ? <Image source={logo} style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 16 }} accessibilityLabel={title || 'Logo'} /> : null}
        {title ? <Text style={{ color: t.ink, fontSize: 28, fontWeight: '800', marginBottom: 4 }}>{title}</Text> : null}
        {tagline ? <Text style={{ color: t.muted, marginBottom: 24 }}>{tagline}</Text> : null}

        {step === 'first' && !builtIn && (
          <Field label="Server address" hint={serverHint}>
            <TextInput style={box} value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" accessibilityLabel="Server address" />
          </Field>
        )}

        {step !== 'second' && offered.length > 1 && (
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.raised, marginBottom: 16 }}>
            {WAYS.filter((w) => offered.indexOf(w.key) !== -1).map((w) => (
              <Pressable key={w.key} onPress={() => chooseWay(w.key)} accessibilityRole="tab" accessibilityState={{ selected: w.key === way }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center', backgroundColor: w.key === way ? t.plane : 'transparent' }}>
                <Text style={{ color: w.key === way ? t.ink : t.muted, fontWeight: '700' }} numberOfLines={1}>{w.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {step === 'first' && way !== 'mobile' && (
          <Field label="Email">
            <TextInput style={box} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="username" accessibilityLabel="Email" />
          </Field>
        )}
        {step === 'first' && way === 'mobile' && (
          <Field label="Mobile number" hint="The number verified on your account.">
            <TextInput style={box} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="+91 98765 43210" placeholderTextColor={t.muted} accessibilityLabel="Mobile number" />
          </Field>
        )}
        {step === 'first' && way === 'password' && (
          <Field label="Password">
            <TextInput style={box} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={go} accessibilityLabel="Password" />
          </Field>
        )}

        {step === 'code' && codeBox}

        {step === 'second' && (
          <>
            <Text style={{ color: t.ink, fontSize: 15, lineHeight: 22, marginBottom: 12 }}>
              <Text style={{ fontWeight: '700' }}>One more step. </Text>
              {SECOND_SAYS[second.method]}
              {second.method !== 'authenticator' ? <Text style={{ fontWeight: '700' }}>{second.sentTo}.</Text> : null}
            </Text>
            {codeBox}
            {second.trustDays > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Switch value={trust} onValueChange={setTrust} accessibilityLabel={'Do not ask again on this phone for ' + second.trustDays + ' days'} />
                <Text style={{ color: t.ink, flex: 1 }}>Don't ask again on this phone for {second.trustDays} days</Text>
              </View>
            )}
          </>
        )}

        {note ? <Text style={{ color: t.muted, marginBottom: 12 }}>{note}</Text> : null}
        {error ? <Text style={{ color: t.danger, marginBottom: 12 }} accessibilityRole="alert">{error}</Text> : null}

        <Btn
          label={busy ? (step === 'first' && way !== 'password' ? 'Sending' : 'Signing in') : (step === 'first' && way !== 'password' ? 'Send me a code' : step === 'second' ? 'Verify' : 'Sign in')}
          variant="primary" busy={busy} onPress={go} disabled={!canGo} />

        {step === 'code' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 20, marginTop: 8 }}>
            {link('Send a new code', () => resend())}
            {link(way === 'mobile' ? 'Change number' : 'Change email', startOver)}
          </View>
        )}
        {step === 'second' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 20, marginTop: 8 }}>
            {second.method !== 'authenticator' ? link('Send a new code', () => resend(second.method)) : null}
            {second.methods.indexOf('email') !== -1 && second.method !== 'email' ? link('Email me a code instead', () => resend('email')) : null}
            {second.methods.indexOf('sms') !== -1 && second.method !== 'sms' ? link('Text me a code instead', () => resend('sms')) : null}
            {second.methods.indexOf('authenticator') !== -1 && second.method !== 'authenticator'
              ? link('Use my authenticator app', () => { setCode(''); setNote(null); setSecond({ ...second, method: 'authenticator', sentTo: '' }) }) : null}
            {link('Start again', startOver)}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
