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
  purpose: "registration" | "password-reset" | "email-change";
  name?: string;
}

const PURPOSE_COPY: Record<
  OtpVerificationEmailProps["purpose"],
  { titleEn: string; titleZh: string; instructionEn: string; instructionZh: string }
> = {
  registration: {
    titleEn: "ACCOUNT REGISTRATION",
    titleZh: "帳號註冊",
    instructionEn: "Use the verification code below to complete your registration.",
    instructionZh: "請使用以下驗證碼完成註冊。",
  },
  "password-reset": {
    titleEn: "PASSWORD RESET",
    titleZh: "密碼重設",
    instructionEn: "Use the verification code below to reset your password.",
    instructionZh: "請使用以下驗證碼重設您的密碼。",
  },
  "email-change": {
    titleEn: "EMAIL VERIFICATION",
    titleZh: "電郵驗證",
    instructionEn:
      "Use the verification code below to confirm your new email address.",
    instructionZh: "請使用以下驗證碼確認您的新電郵地址。",
  },
};

export function OtpVerificationEmail({
  code,
  purpose,
  name,
}: OtpVerificationEmailProps) {
  const { titleEn, titleZh, instructionEn, instructionZh } =
    PURPOSE_COPY[purpose];
  const greeting = name ? `您好 ${name}，` : "您好，";

  return (
    <Html>
      <Head />
      <Preview>
        {SITE_BRAND} {titleZh} — {code}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Brand */}
          <Text style={brandText}>{SITE_BRAND}</Text>

          {/* Title */}
          <Heading style={titleStyle}>
            {titleEn} / {titleZh}
          </Heading>

          <Hr style={hr} />

          {/* Greeting */}
          <Text style={greetingStyle}>{greeting}</Text>

          {/* Instructions */}
          <Text style={text}>{instructionEn}</Text>
          <Text style={text}>{instructionZh}</Text>

          {/* Code */}
          <Section style={codeSection}>
            <Text style={codeLabel}>VERIFICATION CODE / 驗證碼</Text>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={smallNote}>
            驗證碼有效期為 10 分鐘 / The code expires in 10 minutes.
          </Text>

          <Hr style={hr} />

          {/* Security warning */}
          <Text style={text}>
            If you did not request this, please contact {SITE_BRAND}.
          </Text>
          <Text style={text}>
            如非您本人操作，請盡快與我們聯絡。
          </Text>

          {/* Footer */}
          <Text style={footer}>
            Questions? Reply to this email or contact us.
          </Text>
          <Text style={footer}>
            如有疑問，請回覆此電郵或聯絡工作室。
          </Text>

          <Text style={brandFooter}>{SITE_BRAND}</Text>
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
  maxWidth: 480,
  margin: "0 auto",
  padding: "40px 24px",
};

const brandText: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#1a1a1a",
  textAlign: "center",
  letterSpacing: 2,
  margin: "0 0 12px",
};

const titleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#6b7280",
  textAlign: "center",
  margin: "0 0 20px",
};

const greetingStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#1a1a1a",
  margin: "0 0 12px",
};

const text: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: "#4a5568",
  margin: "0 0 14px",
};

const codeSection: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 12,
  border: "1px solid #e6e8ec",
  padding: "28px 16px",
  margin: "24px 0",
  textAlign: "center",
};

const codeLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#9ca3af",
  letterSpacing: 1.5,
  margin: "0 0 12px",
};

const codeText: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 700,
  letterSpacing: 10,
  color: "#ec4899",
  margin: 0,
};

const smallNote: React.CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  textAlign: "center",
  margin: "0 0 8px",
};

const hr: React.CSSProperties = {
  borderColor: "#e6e8ec",
  margin: "20px 0",
};

const footer: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "#718096",
  margin: "0 0 12px",
};

const brandFooter: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#1a1a1a",
  textAlign: "center",
  letterSpacing: 2,
  marginTop: 24,
};
