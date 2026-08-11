import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { SITE_BRAND } from "@/lib/constants";

export interface OtpVerificationEmailProps {
  code: string;
  purpose: "registration" | "password-reset";
}

export function OtpVerificationEmail({
  code,
  purpose,
}: OtpVerificationEmailProps) {
  const title =
    purpose === "registration" ? "註冊驗證碼" : "重設密碼驗證碼";
  const message =
    purpose === "registration"
      ? "歡迎加入！請使用以下驗證碼完成註冊："
      : "您要求重設密碼，請使用以下驗證碼繼續：";

  return (
    <Html>
      <Head />
      <Preview>
        {SITE_BRAND} {title} — {code}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>{SITE_BRAND} {title}</Heading>
          <Text style={text}>{message}</Text>

          <Section style={codeSection}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={text}>
            驗證碼有效期為 <strong>10 分鐘</strong>。如果您沒有要求此操作，請忽略此電郵。
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            如有任何問題，請聯絡我們的 WhatsApp 或回覆此電郵。
          </Text>

          <Text style={copyright}>
            © {new Date().getFullYear()} {SITE_BRAND}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OtpVerificationEmail;

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
  fontSize: 24,
  fontWeight: 700,
  color: "#1a1a1a",
  textAlign: "center",
  margin: "0 0 16px",
};

const text: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "#4a5568",
};

const codeSection: React.CSSProperties = {
  backgroundColor: "#fdf2f8",
  borderRadius: 12,
  padding: "32px 16px",
  margin: "24px 0",
  textAlign: "center",
};

const codeText: React.CSSProperties = {
  fontSize: 42,
  fontWeight: 700,
  letterSpacing: 12,
  color: "#ec4899",
  margin: 0,
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

const copyright: React.CSSProperties = {
  fontSize: 12,
  color: "#a0aec0",
  textAlign: "center" as const,
  marginTop: 24,
};
