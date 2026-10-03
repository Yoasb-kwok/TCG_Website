import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { SITE_BRAND } from "@/lib/constants";

export interface TournamentCancelledEmailProps {
  tournamentTitle: string;
  startsAt: string;
  location: string;
  playerName: string;
}

export function TournamentCancelledEmail({
  tournamentTitle,
  startsAt,
  location,
  playerName,
}: TournamentCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {SITE_BRAND} 店賽取消通知 — {tournamentTitle}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>
            ⚠️ 店賽取消通知
          </Heading>

          <Text style={text}>
            {playerName} 你好，
          </Text>

          <Text style={text}>
            很抱歉通知您，以下店賽已取消：
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>{tournamentTitle}</Text>
            <Text style={infoRow}>
              <strong>日期：</strong>
              {startsAt}
            </Text>
            <Text style={infoRow}>
              <strong>地點：</strong>
              {location}
            </Text>
          </Section>

          <Text style={text}>
            我們對此造成的不便深表歉意。如有任何查詢，請聯絡我們的 WhatsApp 或回覆此電郵。
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            <Link href="https://tcghk.com/tournaments" style={link}>
              查看其他店賽
            </Link>
          </Text>

          <Text style={copyright}>
            © {new Date().getFullYear()} {SITE_BRAND}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TournamentCancelledEmail;

const body: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: React.CSSProperties = {
  maxWidth: 580,
  margin: "0 auto",
  padding: "20px 0 48px",
};

const h1: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#dc2626",
  textAlign: "center",
  margin: "0 0 16px",
};

const text: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "#4a5568",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  borderRadius: 8,
  padding: "16px",
  margin: "16px 0",
  border: "1px solid #fecaca",
};

const infoTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#1a1a1a",
  margin: "0 0 8px",
};

const infoRow: React.CSSProperties = {
  fontSize: 14,
  color: "#4a5568",
  margin: "4px 0",
};

const hr: React.CSSProperties = {
  borderColor: "#e6e8ec",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: 13,
  color: "#718096",
  textAlign: "center" as const,
  margin: "8px 0",
};

const link: React.CSSProperties = {
  color: "#ec4899",
  textDecoration: "underline",
};

const copyright: React.CSSProperties = {
  fontSize: 12,
  color: "#a0aec0",
  textAlign: "center" as const,
  marginTop: 24,
};
