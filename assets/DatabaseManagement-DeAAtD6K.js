const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-BPRkDFwk.js","assets/ui-components-BWr6S92L.js","assets/vendor-react-C5vGbBff.js","assets/vendor-icons-DJesxG0r.js","assets/agents-logic-lA0DTGPN.js","assets/vendor-firebase-DoEDPRtH.js","assets/vendor-charts-Cxanh-16.js","assets/index-CAV5kUQ2.css"])))=>i.map(i=>d[i]);
import{j as t,I as i,_ as d,$ as c,a3 as u}from"./ui-components-BWr6S92L.js";import"./vendor-icons-DJesxG0r.js";import{C as m}from"./index-BPRkDFwk.js";import"./vendor-react-C5vGbBff.js";import"./agents-logic-lA0DTGPN.js";import"./vendor-firebase-DoEDPRtH.js";import"./vendor-charts-Cxanh-16.js";const T=({showMessage:e,isCollapsed:s,onToggle:o})=>t.jsxs(m,{title:"Database Management",icon:"database",isCollapsed:s,onToggle:o,variant:"red",children:[t.jsx("p",{className:"text-xs text-slate-400 mb-4",children:"⚠️ Danger Zone: These operations permanently delete data and cannot be undone."}),t.jsxs("div",{className:"space-y-3",children:[t.jsxs("button",{onClick:async()=>{if(confirm(`🔗 Link Existing Translations?

This will:
1. Find all translated questions (Chinese, Japanese, Korean, etc.)
2. Match them with their English originals
3. Ensure both share the same uniqueId
4. Enable language switching

This is SAFE and won't delete any data.

Proceed?`))try{e("🔄 Starting translation migration...",1e4);const{migrateTranslationsViaCloudFunction:n}=await d(async()=>{const{migrateTranslationsViaCloudFunction:a}=await import("./index-BPRkDFwk.js").then(l=>l.i);return{migrateTranslationsViaCloudFunction:a}},__vite__mapDeps([0,1,2,3,4,5,6,7])),r=await n();if(r.success){const{stats:a}=r;e(`✅ Migration complete!

📊 Statistics:
- Total questions: ${a.totalQuestions}
- Total translations: ${a.totalTranslations}
- Already linked: ${a.alreadyLinked}
- Newly linked: ${a.newlyLinked}
- Orphaned: ${a.orphaned}

Refresh the page to see results.`,1e4)}}catch(n){e(`❌ Migration failed: ${n.message}`,5e3)}},className:"w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-blue-700/50",children:[t.jsx(i,{name:"link",size:16}),"Link Existing Translations (Enable Language Switching)"]}),t.jsxs("button",{onClick:async()=>{if(!confirm(`⚠️ DELETE ALL QUESTIONS?

This will permanently delete ALL questions from the database for ALL users.

This action CANNOT be undone!

Type 'DELETE' to confirm.`))return;if(prompt("Type DELETE to confirm:")!=="DELETE"){e("❌ Deletion cancelled",3e3);return}try{e("🗑️ Deleting all questions...",1e4);const r=await c();e(`✅ Deleted ${r} questions from database`,5e3)}catch(r){e(`❌ Delete failed: ${r.message}`,5e3)}},className:"w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-red-700/50",children:[t.jsx(i,{name:"trash-2",size:16}),"Delete All Questions (ALL USERS)"]}),t.jsxs("button",{onClick:async()=>{if(confirm(`Clear all rejected questions from the database?

This will only delete questions with status='rejected'.`))try{e("🗑️ Clearing rejected questions...",1e4),e("⚠️ Feature not yet implemented - needs Cloud Function",5e3)}catch(n){e(`❌ Clear failed: ${n.message}`,5e3)}},className:"w-full px-4 py-3 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-orange-700/50",children:[t.jsx(i,{name:"filter",size:16}),"Clear Rejected Questions"]}),t.jsxs("button",{onClick:async()=>{if(confirm(`🧹 Cleanup Deleted Questions?

This will permanently remove all questions with status 'deleted' across ALL disciplines.

This is a maintenance operation to resolve count discrepancies.

Proceed?`))try{e("🧹 Cleaning up deleted questions...",1e4);const n=await u();e(`✅ Successfully removed ${n} ghost questions.`,5e3),setTimeout(()=>window.location.reload(),2e3)}catch(n){e(`❌ Cleanup failed: ${n.message}`,5e3)}},className:"w-full px-4 py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-emerald-700/50",children:[t.jsx(i,{name:"trash",size:16}),"Cleanup Deleted Questions (Release Quota)"]})]})]});export{T as default};
