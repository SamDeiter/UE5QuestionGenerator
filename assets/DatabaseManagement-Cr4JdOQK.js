const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/AuthenticatedApp-aAoXo5aW.js","assets/vendor-react-Bo5lPUAp.js","assets/vendor-export-BOwK5y_4.js","assets/view-admin-Di1n6wI-.js","assets/vendor-firebase-firestore-Ea1tKN-o.js","assets/vendor-firebase-core-BXcvCaIa.js","assets/agents-logic-CjodajcS.js","assets/vendor-firebase-auth-nLKH6zqS.js","assets/vendor-icons-CSio9ydm.js","assets/view-analytics-DGfG92jI.js","assets/index-DvnocqsE.js","assets/index-CvWlpZBW.css"])))=>i.map(i=>d[i]);
import{y as c,B as u,I as r,_ as m,aj as g,ap as p}from"./view-admin-Di1n6wI-.js";import{j as n}from"./vendor-react-Bo5lPUAp.js";import{l as i}from"./agents-logic-CjodajcS.js";import"./vendor-firebase-firestore-Ea1tKN-o.js";import"./vendor-firebase-core-BXcvCaIa.js";import"./vendor-firebase-auth-nLKH6zqS.js";import"./vendor-icons-CSio9ydm.js";import"./vendor-export-BOwK5y_4.js";const j=({isCollapsed:o,onToggle:l})=>{const{showMessage:e}=c();return n.jsxs(u,{title:"Database Management",icon:"database",isCollapsed:o,onToggle:l,variant:"red",children:[n.jsx("p",{className:"text-xs text-slate-400 mb-4",children:"⚠️ Danger Zone: These operations permanently delete data and cannot be undone."}),n.jsxs("div",{className:"space-y-3",children:[n.jsxs("button",{onClick:async()=>{if(confirm(`🔗 Link Existing Translations?

This will:
1. Find all translated questions (Chinese, Japanese, Korean, etc.)
2. Match them with their English originals
3. Ensure both share the same uniqueId
4. Enable language switching

This is SAFE and won't delete any data.

Proceed?`))try{e("🔄 Starting translation migration...",1e4);const{migrateTranslationsViaCloudFunction:t}=await m(async()=>{const{migrateTranslationsViaCloudFunction:a}=await import("./AuthenticatedApp-aAoXo5aW.js").then(d=>d.i);return{migrateTranslationsViaCloudFunction:a}},__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11])),s=await t();if(s.success){const{stats:a}=s;e(`✅ Migration complete!

📊 Statistics:
- Total questions: ${a.totalQuestions}
- Total translations: ${a.totalTranslations}
- Already linked: ${a.alreadyLinked}
- Newly linked: ${a.newlyLinked}
- Orphaned: ${a.orphaned}

Refresh the page to see results.`,1e4)}}catch(t){e(`❌ Migration failed: ${t.message}`,5e3),i.error(t)}},className:"w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-blue-700/50",children:[n.jsx(r,{name:"link",size:16}),"Link Existing Translations (Enable Language Switching)"]}),n.jsxs("button",{onClick:async()=>{if(!confirm(`⚠️ DELETE ALL QUESTIONS?

This will permanently delete ALL questions from the database for ALL users.

This action CANNOT be undone!

Type 'DELETE' to confirm.`))return;if(prompt("Type DELETE to confirm:")!=="DELETE"){e("❌ Deletion cancelled",3e3);return}try{e("🗑️ Deleting all questions...",1e4);const s=await g();e(`✅ Deleted ${s} questions from database`,5e3)}catch(s){e(`❌ Delete failed: ${s.message}`,5e3),i.error(s)}},className:"w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-red-700/50",children:[n.jsx(r,{name:"trash-2",size:16}),"Delete All Questions (ALL USERS)"]}),n.jsxs("button",{onClick:async()=>{if(confirm(`Clear all rejected questions from the database?

This will only delete questions with status='rejected'.`))try{e("🗑️ Clearing rejected questions...",1e4),e("⚠️ Feature not yet implemented - needs Cloud Function",5e3)}catch(t){e(`❌ Clear failed: ${t.message}`,5e3)}},className:"w-full px-4 py-3 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-orange-700/50",children:[n.jsx(r,{name:"filter",size:16}),"Clear Rejected Questions"]}),n.jsxs("button",{onClick:async()=>{if(confirm(`🧹 Cleanup Deleted Questions?

This will permanently remove all questions with status 'deleted' across ALL disciplines.

This is a maintenance operation to resolve count discrepancies.

Proceed?`))try{e("🧹 Cleaning up deleted questions...",1e4);const t=await p();e(`✅ Successfully removed ${t} ghost questions.`,5e3),setTimeout(()=>window.location.reload(),2e3)}catch(t){e(`❌ Cleanup failed: ${t.message}`,5e3),i.error(t)}},className:"w-full px-4 py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 rounded font-bold transition-all flex items-center justify-center gap-2 border border-emerald-700/50",children:[n.jsx(r,{name:"trash",size:16}),"Cleanup Deleted Questions (Release Quota)"]})]})]})};export{j as default};
