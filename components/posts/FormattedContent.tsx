'use client'

/**
 * Component to display text with formatted @ mentions
 * Highlights @username patterns in violet color
 */
export function FormattedContent({ content }: { content: string }) {
  // Split content by @ mentions
  const parts = content.split(/(@\w+)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a mention
        if (part.match(/^@\w+$/)) {
          return (
            <span 
              key={index} 
              className="text-violet-600 dark:text-violet-400 font-semibold cursor-pointer hover:underline"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
