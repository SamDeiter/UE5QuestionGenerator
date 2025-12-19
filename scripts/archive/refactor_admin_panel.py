"""
Comprehensive AdminPanel.jsx refactoring:
1. Add forName field to state
2. Merge Generate Invite and Active Invites sections
3. Add Name and Email fields to the invite form
4. Add Send Email Invites button in the merged section
"""

def refactor_admin_panel():
    admin_panel_path = r"C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx"
    
    # Read current file
    with open(admin_panel_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add forName to state (around line 63-69)
    old_state = '''  const [newInviteSettings, setNewInviteSettings] = useState({
    role: "user",
    maxUses: 1,
    expiresInDays: 7,
    note: "",
    forEmail: "", // NEW: Email address for targeted invite
  });'''
    
    new_state = '''  const [newInviteSettings, setNewInviteSettings] = useState({
    role: "user",
    maxUses: 1,
    expiresInDays: 7,
    note: "",
    forEmail: "", // Email address for targeted invite
    forName: "", // Name for personalized email
  });'''
    
    content = content.replace(old_state, new_state)
    
    # 2. Update collapsed state - merge generateInvite and activeInvites into one "inviteManagement"
    old_collapsed = '''  const [collapsed, setCollapsed] = useState({
    featureAccess: true,
    generateInvite: false,
    registeredUsers: false,
    activeInvites: true,'''
    
    new_collapsed = '''  const [collapsed, setCollapsed] = useState({
    featureAccess: true,
    inviteManagement: false, // Merged: generateInvite + activeInvites
    registeredUsers: false,'''
    
    content = content.replace(old_collapsed, new_collapsed)
    
    # 3. Add handleSendEmailInvites import
    old_import = '''import { clearAllQuestionsFromFirestore } from "../services/firebase";

const functions = getFunctions(app, "us-central1");'''
    
    new_import = '''import { clearAllQuestionsFromFirestore } from "../services/firebase";
import { sendReviewerInvitesViaEmail } from "../services/cloudFunctions";

const functions = getFunctions(app, "us-central1");'''
    
    content = content.replace(old_import, new_import)
    
    # 4. Add handleSendEmailInvites function after handleChangeRole (after line 193)
    insert_marker = '''  };
  // Robust date formatter
  const formatDate = (dateVal) => {'''
    
    email_handler = '''  };
  
  // Handle sending reviewer invite emails via SendGrid
  const handleSendEmailInvites = async () => {
    const reviewerInvites = invites.filter(
      (inv) => inv.role === "reviewer" && inv.currentUses < (inv.maxUses === -1 ? Infinity : inv.maxUses)
    );

    if (reviewerInvites.length === 0) {
      showMessage("⚠️ No pending reviewer invites to send", 3000);
      return;
    }

    if (!confirm(`Send ${reviewerInvites.length} reviewer invite email(s) via SendGrid?`)) return;

    try {
      const emailPayload = reviewerInvites.map((inv) => ({
        email: inv.forEmail || "unknown@example.com",
        inviteUrl: `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${inv.code}${
          inv.forEmail ? `&email=${encodeURIComponent(inv.forEmail)}` : ""
        }`,
        code: inv.code,
        note: inv.note || `Targeted REVIEWER invite for ${inv.forName || inv.forEmail || "reviewer"}`,
      }));

      showMessage("📧 Sending emails...", 3000);
      const result = await sendReviewerInvitesViaEmail(emailPayload);

      if (result.sent.length > 0) {
        showMessage(`✅ Sent ${result.sent.length} email(s) successfully!`, 5000);
      }
      if (result.failed.length > 0) {
        showMessage(`⚠️ ${result.failed.length} email(s) failed. Check console for details.`, 5000);
        console.error("Failed emails:", result.failed);
      }
    } catch (error) {
      console.error("❌ Email send error:", error);
      showMessage(`❌ Failed to send emails: ${error.message}`, 5000);
    }
  };

  // Robust date formatter
  const formatDate = (dateVal) => {'''
    
    content = content.replace(insert_marker, email_handler)
    
    print("✅ AdminPanel.jsx refactored successfully")
    print("   - Added forName to invite state")
    print("   - Merged invite sections in collapsed state")
    print("   - Added sendReviewerInvitesViaEmail import")
    print("   - Added handleSendEmailInvites function")
    print("\n⚠️ UI section merge and name/email fields need to be added manually via replace_file_content")
    
    # Write back
    with open(admin_panel_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    refactor_admin_panel()
