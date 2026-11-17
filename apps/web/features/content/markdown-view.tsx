import { UiLink } from "@app/ui";
import type { ReactNode } from "react";
import { parseMarkdown, type MarkdownInline } from "./markdown";

function inline(nodes: readonly MarkdownInline[], key = ""): ReactNode[] {
  return nodes.map((node, index) => {
    const id = `${key}${index}`;
    switch (node.type) {
      case "text":
        return node.value;
      case "code":
        return (
          <code key={id} className="rounded-chip bg-surface-2 px-1 text-small">
            {node.value}
          </code>
        );
      case "strong":
        return (
          <strong key={id} className="font-[600]">
            {inline(node.children, `${id}-`)}
          </strong>
        );
      case "em":
        return <em key={id}>{inline(node.children, `${id}-`)}</em>;
      case "link": {
        const external = /^https?:/i.test(node.href);
        return (
          <UiLink key={id} href={node.href} className="text-ink underline underline-offset-4" {...(external ? { rel: "noopener noreferrer nofollow" } : {})}>
            {inline(node.children, `${id}-`)}
          </UiLink>
        );
      }
    }
  });
}

/** Zeigt Markdown aus dem CMS ohne HTML (Entscheid 0022). Überschriften beginnen bei h2; h1 ist der Titel der Seite. */
export function MarkdownView({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={className ?? "flex max-w-prose flex-col gap-4"} data-markdown>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = `h${block.level}` as "h2" | "h3" | "h4";
          return (
            <Tag key={index} className={block.level === 2 ? "pt-2 text-h2" : "text-h3"}>
              {inline(block.children)}
            </Tag>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index} className={`flex flex-col gap-1 pl-6 text-body ${block.ordered ? "list-decimal" : "list-disc"}`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item, `${index}-${itemIndex}-`)}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={index} className="text-body">
            {inline(block.children)}
          </p>
        );
      })}
    </div>
  );
}
