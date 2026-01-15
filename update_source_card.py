
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\QuestionItem\SourceContextCard.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update props
old_props = 'const SourceContextCard = ({ sourceUrl, sourceExcerpt, isVerified }) => {'
new_props = 'const SourceContextCard = ({\n  sourceUrl,\n  sourceExcerpt,\n  isVerified,\n  verifiedBy,\n  verifiedAt,\n  onVerify,\n}) => {'
content = content.replace(old_props, new_props)

# 2. Update renderAction to include verification logic and message
# We'll replace the whole renderAction function for clarity
old_render_action = """  const renderAction = () => {
    if (hasValidUrl) {
      const cleanUrl = sourceUrl.trim();
      return (
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-semibold rounded-md border border-orange-500/40 transition-all hover:border-orange-500/60 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            logger.log(`[SourceContextCard] Navigating to: ${cleanUrl}`);
          }}
          title={`Check official documentation: ${cleanUrl}`}
        >
          <Icon name="external-link" size={12} /> Verify Source
        </a>
      );
    }"""

new_render_action = """  const renderAction = () => {
    if (hasValidUrl) {
      const cleanUrl = sourceUrl.trim();
      return (
        <div className="flex flex-col gap-2">
          {isVerified && verifiedBy && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-left-1 duration-300">
              <Icon name="check-circle" size={14} />
              AI was verified by {verifiedBy} on {new Date(verifiedAt || Date.now()).toLocaleDateString()}
            </div>
          )}
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-semibold rounded-md border border-orange-500/40 transition-all hover:border-orange-500/60 cursor-pointer"
            onClick={(e) => {
              // Note: We don't call e.preventDefault() because we WANT to open the link
              logger.log(`[SourceContextCard] Navigating to: ${cleanUrl}`);
              if (onVerify && !isVerified) {
                onVerify();
              }
            }}
            title={`Check official documentation: ${cleanUrl}`}
          >
            <Icon name="external-link" size={12} /> {isVerified ? 'Re-Verify Source' : 'Verify Source'}
          </a>
        </div>
      );
    }"""

content = content.replace(old_render_action, new_render_action)

# 3. Update the warning message to reflect verification status
old_warning = '<p className="text-slate-600 text-xs mt-1">\n            ⚠️ AI-generated excerpt — click "Verify Source" to confirm this text\n            appears on the page\n          </p>'
new_warning = """          {!isVerified ? (
            <p className="text-slate-600 text-xs mt-1">
              ⚠️ AI-generated excerpt — click "Verify Source" to confirm this text
              appears on the page
            </p>
          ) : (
            <p className="text-emerald-500/70 text-xs mt-1 flex items-center gap-1">
              <Icon name="check" size={12} /> Source content verified by reviewer
            </p>
          )}"""

content = content.replace(old_warning, new_warning)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(content)

print("SourceContextCard.jsx updated successfully.")
