import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface VerifyEmailTemplateProps {
  confirmUrl: string
  appUrl: string
}

export function VerifyEmailTemplate({ confirmUrl, appUrl }: VerifyEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email to get started with Notus</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Notus</Heading>
          <Heading style={h2}>Verify your email address</Heading>
          <Text style={text}>
            Thanks for signing up! Click the button below to verify your email address and
            activate your account.
          </Text>
          <Section style={buttonContainer}>
            <Button href={confirmUrl} style={button}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={footer}>
            If you didn&apos;t create an account, you can safely ignore this email.
            This link expires in 24 hours.
          </Text>
          <Text style={footer}>
            <Link href={appUrl} style={link}>
              {appUrl}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#09090b',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}

const h1 = {
  color: '#6366f1',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 8px',
}

const h2 = {
  color: '#f4f4f5',
  fontSize: '22px',
  fontWeight: '600',
  margin: '0 0 24px',
}

const text = {
  color: '#a1a1aa',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const buttonContainer = {
  margin: '32px 0',
}

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

const footer = {
  color: '#71717a',
  fontSize: '14px',
  margin: '0 0 8px',
}

const link = {
  color: '#6366f1',
  textDecoration: 'underline',
}
