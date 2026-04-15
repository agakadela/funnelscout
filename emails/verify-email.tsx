import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type VerifyEmailProps = {
  verifyUrl: string;
};

export default function VerifyEmail({ verifyUrl }: VerifyEmailProps) {
  const previewText = "Verify your FunnelScout email";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Verify your email address</Heading>
          <Text style={text}>
            Thanks for signing up! Click the button below to verify your email
            and get started.
          </Text>
          <Section style={buttonSection}>
            <Button href={verifyUrl} style={button}>
              Verify email
            </Button>
          </Section>
          <Text style={muted}>
            If you didn&apos;t create a FunnelScout account, you can ignore this
            email.
          </Text>
          <Text style={footer}>FunnelScout</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "24px 16px 48px",
  maxWidth: "560px",
};

const h1 = {
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "600" as const,
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const text = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const muted = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "24px 0 0",
};

const footer = {
  color: "#94a3b8",
  fontSize: "12px",
  margin: "32px 0 0",
};

const buttonSection = {
  margin: "24px 0 0",
};

const button = {
  backgroundColor: "#f59e0b",
  borderRadius: "6px",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 20px",
};
