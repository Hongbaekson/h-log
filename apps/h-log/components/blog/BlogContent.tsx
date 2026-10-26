import type { ReactNode } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import type { PublicBlogContentBlock, PublicBlogInlineContent } from "@/lib/blog-public";

export function BlogContent({ blocks }: { blocks: readonly PublicBlogContentBlock[] }) {
  return <>{blocks.map(renderContentBlock)}</>;
}

function renderContentBlock(block: PublicBlogContentBlock, index: number): ReactNode {
  if (block.type === "diagram") {
    return (
      <figure
        className="mt-8 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/50"
        key={`${block.assetHash}-${index}`}
      >
        <Image
          alt={block.alt}
          className="h-auto w-full"
          height={675}
          src={block.path}
          unoptimized
          width={1200}
        />
        <figcaption className="border-t border-slate-700 px-4 py-3 text-[15px] leading-7 text-slate-400">
          {block.alt}
        </figcaption>
      </figure>
    );
  }

  if (block.type === "code") {
    return <CodeBlock code={block.code} key={index} language={block.language} />;
  }

  if (block.type === "list") {
    const List = block.start === null ? "ul" : "ol";

    return (
      <List
        className={`mt-5 space-y-2 pl-6 leading-8 ${block.start === null ? "list-disc" : "list-decimal"}`}
        key={index}
        start={block.start ?? undefined}
      >
        {block.items.map((item, itemIndex) => (
          <li className="min-w-0 wrap-anywhere [&>ol]:mt-2 [&>ul]:mt-2 [&>:first-child]:mt-0" key={itemIndex}>
            {item.map(renderContentBlock)}
          </li>
        ))}
      </List>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        className="mt-5 min-w-0 border-l-2 border-[#5865f2] pl-4 wrap-anywhere [&>:first-child]:mt-0"
        key={index}
      >
        {block.children.map(renderContentBlock)}
      </blockquote>
    );
  }

  if (block.type === "table") {
    return (
      <div
        aria-label="표 (가로 스크롤)"
        className="relative my-8 max-w-full overflow-x-auto rounded-xl border border-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
        key={index}
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[36rem] table-fixed border-collapse text-[15px] leading-7 wrap-anywhere">
          <thead className="bg-[#5865f2]/10 text-slate-100">
            <tr>
              {block.header.map((cell, column) => (
                <th
                  className="border-b border-slate-700 px-4 py-3 align-top font-semibold"
                  key={column}
                  scope="col"
                  style={{ textAlign: block.align[column] ?? "left" }}
                >
                  {renderInlineContent(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/70">
            {block.rows.map((row, rowIndex) => (
              <tr className="even:bg-slate-800/30" key={rowIndex}>
                {row.map((cell, column) => (
                  <td
                    className="px-4 py-3 align-top"
                    key={column}
                    style={{ textAlign: block.align[column] ?? "left" }}
                  >
                    {renderInlineContent(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "heading") {
    if (block.level === 1) {
      return <h1 className="mt-10 scroll-mt-28 text-2xl font-bold text-white wrap-anywhere" id={block.id} key={index} tabIndex={-1}>{renderInlineContent(block.children)}</h1>;
    }

    const Heading = block.level === 2 ? "h2" : "h3";

    return (
      <Heading
        className="scroll-mt-28 rounded-sm wrap-anywhere focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
        id={block.id}
        key={index}
        tabIndex={-1}
      >
        {renderInlineContent(block.children)}
        <a
          aria-label="이 제목으로 이동"
          className="ml-2 inline-block rounded-sm font-normal text-slate-400 hover:text-[#b6bdff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
          href={`#${encodeURIComponent(block.id)}`}
        >
          <span aria-hidden="true">#</span>
        </a>
      </Heading>
    );
  }

  return <p key={index}>{renderInlineContent(block.children)}</p>;
}

function renderInlineContent(children: readonly PublicBlogInlineContent[]): ReactNode {
  return children.map((child, index) => {
    if (child.type === "code") {
      return <code key={index}>{child.text}</code>;
    }

    if (child.type === "strong") {
      return <strong key={index}>{renderInlineContent(child.children)}</strong>;
    }

    if (child.type === "link") {
      const external = child.href.startsWith("https:");

      return (
        <a
          className="rounded-sm text-[#b6bdff] underline decoration-[#b6bdff]/50 underline-offset-4 wrap-anywhere hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
          href={child.href}
          key={index}
          rel={external ? "noopener noreferrer" : undefined}
          target={external ? "_blank" : undefined}
        >
          {renderInlineContent(child.children)}
          {external && (
            <>
              <span className="sr-only"> (새 창에서 열림)</span>
              <ExternalLink aria-hidden="true" className="ml-1 inline-block align-baseline" size={12} />
            </>
          )}
        </a>
      );
    }

    return <span key={index}>{child.text}</span>;
  });
}
