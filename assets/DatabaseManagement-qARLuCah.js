const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-DAaQYyMV.js","assets/ui-components-BakUOUuM.js","assets/vendor-react-C5vGbBff.js","assets/vendor-icons-k0XSysfH.js","assets/agents-logic-Dl98d14p.js","assets/vendor-firebase-v9PRsiIa.js","assets/vendor-charts-zOYudPY3.js","assets/index-CR6BSht-.css"])))=>i.map(i=>d[i]);
import{j as n,I as i,_ as c,ah as u,ar as m}from"./ui-components-BakUOUuM.js";import"./vendor-icons-k0XSysfH.js";import{C as f}from"./index-DAaQYyMV.js";import{l as o}from"./agents-logic-Dl98d14p.js";import"./vendor-react-C5vGbBff.js";import"./vendor-firebase-v9PRsiIa.js";import"./vendor-charts-zOYudPY3.js";const E=({showMessage:e,isCollapsed:s,onToggle:l})=>n.jsxs(f,{title:"Database Management",icon:"database",isCollapsed:s,onToggle:l,variant:"red",children:[n.jsx("p",{className:"text-xs text-slate-400 mb-4",children:"⚠️ Danger Zone: These operations permanently delete data and cannot be undone."}),n.jsxs("div",{className:"space-y-3",children:[n.jsxs("button",{onClick:async()=>{if(confirm(`🔗 Link Existing Translations?

This will:
1. Find all translated questions (Chinese, Japanese, Korean, etc.)
2. Match them with their English originals
3. Ensure both share the same uniqueId
4. Enable language switching

This is SAFE and won't delete any data.

Proceed?`))try{e("🔄 Starting translation migration...",1e4);const{migrateTranslationsViaCloudFunction:t}=await c(async()=>{const{migrateTranslationsViaCloudFunction:a}=await import("./index-DAaQYyMV.js").then(d=>d.k);return{migrateTranslationsViaCloudFunction:a}},__vite__mapDeps([0,1,2,3,4,5,6,7])),r=await t();if(r.success){const{stats:a}=r;e(`✅ Migration complete!

📊 Statistics:
- Total questions: ${a.totalQuestions}
- Total translations: ${a.totalTranslations}
- Already linked: ${a.alreadyLinked}
- Newly linked: ${a.newlyLinked}
- Orphaned: ${a.orphaned}

Refresh the page to see results.`,1e4)}}catch(t){e(`❌ Migration failed: ${t.message}`,5e3),o.error(t)}},className:"w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-blue-700/50",children:[n.jsx(i,{name:"link",size:16}),"Link Existing Translations (Enable Language Switching)"]}),n.jsxs("button",{onClick:async()=>{if(!confirm(`⚠️ DELETE ALL QUESTIONS?

This will permanently delete ALL questions from the database for ALL users.

This action CANNOT be undone!

Type 'DELETE' to confirm.`))return;if(prompt("Type DELETE to confirm:")!=="DELETE"){e("❌ Deletion cancelled",3e3);return}try{e("🗑️ Deleting all questions...",1e4);const r=await u();e(`✅ Deleted ${r} questions from database`,5e3)}catch(r){e(`❌ Delete failed: ${r.message}`,5e3),o.error(r)}},className:"w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-red-700/50",children:[n.jsx(i,{name:"trash-2",size:16}),"Delete All Questions (ALL USERS)"]}),n.jsxs("button",{onClick:async()=>{if(confirm(`Clear all rejected questions from the database?

This will only delete questions with status='rejected'.`))try{e("🗑️ Clearing rejected questions...",1e4),e("⚠️ Feature not yet implemented - needs Cloud Function",5e3)}catch(t){e(`❌ Clear failed: ${t.message}`,5e3)}},className:"w-full px-4 py-3 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-orange-700/50",children:[n.jsx(i,{name:"filter",size:16}),"Clear Rejected Questions"]}),n.jsxs("button",{onClick:async()=>{if(confirm(`🧹 Cleanup Deleted Questions?

This will permanently remove all questions with status 'deleted' across ALL disciplines.

This is a maintenance operation to resolve count discrepancies.

Proceed?`))try{e("🧹 Cleaning up deleted questions...",1e4);const t=await m();e(`✅ Successfully removed ${t} ghost questions.`,5e3),setTimeout(()=>window.location.reload(),2e3)}catch(t){e(`❌ Cleanup failed: ${t.message}`,5e3),o.error(t)}},className:"w-full px-4 py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-emerald-700/50",children:[n.jsx(i,{name:"trash",size:16}),"Cleanup Deleted Questions (Release Quota)"]})]})]});export{E as default};
