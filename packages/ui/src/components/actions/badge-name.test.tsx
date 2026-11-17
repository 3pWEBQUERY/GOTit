import { render, screen } from "@testing-library/react";
import { MessageSquare } from "lucide-react";
import { describe, expect, it } from "vitest";
import { GlassTabBar } from "../shell/glass-tab-bar";
import { IconLink } from "./icon-link";

describe("Zahl am Icon", () => {
  it("nennt mit badgeLabel die Bedeutung der Zahl im Namen", () => {
    render(<IconLink href="/nachrichten" label="Nachrichten" badge={3} badgeLabel="3 ungelesen" icon={<MessageSquare />} />);
    expect(screen.getByRole("link", { name: "Nachrichten, 3 ungelesen" })).toBeTruthy();
  });

  it("zeigt ohne Zahl nur den Namen", () => {
    render(<IconLink href="/nachrichten" label="Nachrichten" badge={0} badgeLabel="0 ungelesen" icon={<MessageSquare />} />);
    expect(screen.getByRole("link", { name: "Nachrichten" })).toBeTruthy();
  });

  it("gilt auch in der Tab-Leiste", () => {
    render(<GlassTabBar label="Bereiche" mode="member" items={[{ key: "messages", label: "Nachrichten", href: "/nachrichten", icon: <MessageSquare />, badge: 120, badgeLabel: "120 ungelesen" }]} />);
    const link = screen.getByRole("link", { name: "Nachrichten, 120 ungelesen" });
    expect(link.textContent).toContain("99+");
  });
});
