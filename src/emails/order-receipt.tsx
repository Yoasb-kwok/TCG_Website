import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { SITE_BRAND } from "@/lib/constants";

export interface OrderReceiptItem {
  name: string;
  condition: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderReceiptEmailProps {
  orderId: string;
  customerEmail: string;
  items: OrderReceiptItem[];
  totalAmount: number;
  orderDate: string;
}

export function OrderReceiptEmail({
  orderId,
  customerEmail,
  items,
  totalAmount,
  orderDate,
}: OrderReceiptEmailProps) {
  const formatHKD = (n: number) =>
    new Intl.NumberFormat("zh-HK", {
      style: "currency",
      currency: "HKD",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <Html>
      <Head />
      <Preview>{SITE_BRAND} 訂單確認 — 感謝您的購買</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>{SITE_BRAND} 訂單確認</Heading>
          <Text style={text}>
            感謝您的購買！我們已收到您的付款，以下是您的訂單詳情。
          </Text>

          <Section style={orderInfo}>
            <Text style={infoRow}>
              <strong>訂單編號：</strong>
              {orderId.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={infoRow}>
              <strong>訂購日期：</strong>
              {orderDate}
            </Text>
            <Text style={infoRow}>
              <strong>電郵：</strong>
              {customerEmail}
            </Text>
          </Section>

          <Hr style={hr} />

          <Heading style={h2}>訂單內容</Heading>
          <Section>
            {items.map((item, i) => (
              <Section key={i} style={itemRow}>
                <Text style={itemName}>
                  {item.name}
                  {item.condition ? ` (${item.condition})` : ""}
                </Text>
                <Text style={itemDetail}>
                  數量：{item.quantity} × {formatHKD(item.unitPrice)} ={" "}
                  {formatHKD(item.unitPrice * item.quantity)}
                </Text>
              </Section>
            ))}
          </Section>

          <Hr style={hr} />

          <Section style={totalSection}>
            <Text style={totalText}>
              總計：<strong>{formatHKD(totalAmount)}</strong>
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            如有任何問題，請聯絡我們的 WhatsApp 或回覆此電郵。
          </Text>
          <Text style={footer}>
            <Link href="https://tcghk.com" style={link}>
              前往 {SITE_BRAND} 網店
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

export default OrderReceiptEmail;

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

const h2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#1a1a1a",
  margin: "0 0 12px",
};

const text: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "#4a5568",
};

const orderInfo: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: 8,
  padding: "16px",
  margin: "16px 0",
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

const itemRow: React.CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid #f0f0f0",
};

const itemName: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#1a1a1a",
  margin: "0 0 2px",
};

const itemDetail: React.CSSProperties = {
  fontSize: 13,
  color: "#718096",
  margin: 0,
};

const totalSection: React.CSSProperties = {
  textAlign: "right" as const,
};

const totalText: React.CSSProperties = {
  fontSize: 18,
  color: "#1a1a1a",
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
