import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./MarkdownRenderer.module.css";

interface MarkdownRendererProps {
  markdown: string;
  className?: string; // Optional additional className
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown, className }) => {
  // Combine the scoped styles with any additional classes
  const combinedClasses = `${styles.markdownBody} ${className || ""}`;

  return (
    <div className={combinedClasses}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;