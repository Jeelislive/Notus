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

interface ResetPasswordTemplateProps {
  resetUrl: string
  appUrl: string
}

export function ResetPasswordTemplate({ resetUrl, appUrl }: ResetPasswordTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Notus password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Notus</Heading>
          <Heading style={h2}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset your password. Click the button below to
            choose a new password. This link expires in 1 hour.
          </Text>
          <Section style={buttonContainer}>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
          </Section>
          <Text style={footer}>
            If you didn&apos;t request a password reset, you can safely ignore this email.
            Your password won&apos;t be changed.
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
