const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-RHRu5Gkv.js","assets/ui-components-BlwczY4p.js","assets/vendor-react-C5vGbBff.js","assets/vendor-icons-DJesxG0r.js","assets/agents-logic-BGqZAzf3.js","assets/vendor-firebase-C_ZlJ2cs.js","assets/vendor-charts-Cxanh-16.js","assets/index-B5KCM0fa.css"])))=>i.map(i=>d[i]);
import{j as e,I as i,_ as d,Y as c,a1 as u}from"./ui-components-BlwczY4p.js";import"./vendor-icons-DJesxG0r.js";import"./vendor-react-C5vGbBff.js";import"./agents-logic-BGqZAzf3.js";import"./vendor-firebase-C_ZlJ2cs.js";import"./vendor-charts-Cxanh-16.js";const g=({showMessage:t,isCollapsed:s,onToggle:o})=>e.jsxs("div",{className:"bg-slate-800 rounded-lg p-4 border border-red-500/30",children:[e.jsxs("h2",{onClick:o,className:"cursor-pointer hover:text-white transition-colors text-lg font-bold text-red-400 mb-3 flex items-center gap-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(i,{name:"database",size:18})," Database Management"]}),e.jsx(i,{name:s?"chevron-down":"chevron-up",size:16,className:"ml-auto opacity-50"})]}),!s&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"text-xs text-slate-400 mb-4",children:"⚠️ Danger Zone: These operations permanently delete data and cannot be undone."}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("button",{onClick:async()=>{if(confirm(`🔗 Link Existing Translations?

This will:
1. Find all translated questions (Chinese, Japanese, Korean, etc.)
2. Match them with their English originals
3. Ensure both share the same uniqueId
4. Enable language switching

This is SAFE and won't delete any data.

Proceed?`))try{t("🔄 Starting translation migration...",1e4);const{migrateTranslationsViaCloudFunction:n}=await d(async()=>{const{migrateTranslationsViaCloudFunction:a}=await import("./index-RHRu5Gkv.js").then(l=>l.i);return{migrateTranslationsViaCloudFunction:a}},__vite__mapDeps([0,1,2,3,4,5,6,7])),r=await n();if(r.success){const{stats:a}=r;t(`✅ Migration complete!

📊 Statistics:
- Total questions: ${a.totalQuestions}
- Total translations: ${a.totalTranslations}
- Already linked: ${a.alreadyLinked}
- Newly linked: ${a.newlyLinked}
- Orphaned: ${a.orphaned}

Refresh the page to see results.`,1e4)}}catch(n){t(`❌ Migration failed: ${n.message}`,5e3)}},className:"w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-blue-700/50",children:[e.jsx(i,{name:"link",size:16}),"Link Existing Translations (Enable Language Switching)"]}),e.jsxs("button",{onClick:async()=>{if(!confirm(`⚠️ DELETE ALL QUESTIONS?

This will permanently delete ALL questions from the database for ALL users.

This action CANNOT be undone!

Type 'DELETE' to confirm.`))return;if(prompt("Type DELETE to confirm:")!=="DELETE"){t("❌ Deletion cancelled",3e3);return}try{t("🗑️ Deleting all questions...",1e4);const r=await c();t(`✅ Deleted ${r} questions from database`,5e3)}catch(r){t(`❌ Delete failed: ${r.message}`,5e3)}},className:"w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-red-700/50",children:[e.jsx(i,{name:"trash-2",size:16}),"Delete All Questions (ALL USERS)"]}),e.jsxs("button",{onClick:async()=>{if(confirm(`Clear all rejected questions from the database?

This will only delete questions with status='rejected'.`))try{t("🗑️ Clearing rejected questions...",1e4),t("⚠️ Feature not yet implemented - needs Cloud Function",5e3)}catch(n){t(`❌ Clear failed: ${n.message}`,5e3)}},className:"w-full px-4 py-3 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-orange-700/50",children:[e.jsx(i,{name:"filter",size:16}),"Clear Rejected Questions"]}),e.jsxs("button",{onClick:async()=>{if(confirm(`🧹 Cleanup Deleted Questions?

This will permanently remove all questions with status 'deleted' across ALL disciplines.

This is a maintenance operation to resolve count discrepancies.

Proceed?`))try{t("🧹 Cleaning up deleted questions...",1e4);const n=await u();t(`✅ Successfully removed ${n} ghost questions.`,5e3),setTimeout(()=>window.location.reload(),2e3)}catch(n){t(`❌ Cleanup failed: ${n.message}`,5e3)}},className:"w-full px-4 py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-emerald-700/50",children:[e.jsx(i,{name:"trash",size:16}),"Cleanup Deleted Questions (Release Quota)"]})]})]})]});export{g as default};
