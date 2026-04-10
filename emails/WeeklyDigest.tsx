import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type WeeklyDigestEmailProps = {
  agencyName: string;
  subAccountName: string;
  dashboardUrl: string;
  recommendations: { title: string; body: string; impact: string }[];
};

export default function WeeklyDigestEmail({
  agencyName,
  subAccountName,
  dashboardUrl,
  recommendations,
}: WeeklyDigestEmailProps) {
  const previewText = `Weekly digest for ${subAccountName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Pipeline digest</Heading>
          <Text style={text}>
            <strong>{agencyName}</strong> — <strong>{subAccountName}</strong>
          </Text>
          <Text style={muted}>
            Here are your top recommendations from this week&apos;s analysis.
          </Text>

          {recommendations.map((rec, i) => (
            <Section key={`${rec.title}-${i}`} style={card}>
              <Text style={badge}>Impact: {rec.impact}</Text>
              <Text style={recTitle}>{rec.title}</Text>
              <Text style={text}>{rec.body}</Text>
            </Section>
          ))}

          <Section style={{ marginTop: 24 }}>
            <Link href={dashboardUrl} style={link}>
              Open account in FunnelScout
            </Link>
          </Section>
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
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const text = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "1.55",
  margin: "0 0 12px",
};

const muted = {
  ...text,
  color: "#64748b",
  fontSize: "14px",
};

const card = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
};

const badge = {
  ...text,
  fontSize: "12px",
  fontWeight: "600",
  color: "#0369a1",
  marginBottom: "8px",
};

const recTitle = {
  ...text,
  fontWeight: "600",
  color: "#0f172a",
  marginBottom: "8px",
};

const link = {
  color: "#2563eb",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "underline",
};
