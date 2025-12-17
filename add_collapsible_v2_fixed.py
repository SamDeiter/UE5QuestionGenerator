"""
Add collapsible sections to Admin Panel safely.
"""

file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state and toggle function
state_injection = """  // Super Admin check - only sam.deiter@epicgames.com
  const isSuperAdmin = currentUser?.email === "sam.deiter@epicgames.com";

  // Collapsible sections state
  const [collapsed, setCollapsed] = useState({
    featureAccess: true,
    generateInvite: false,
    registeredUsers: false,
    activeInvites: true,
    apiConfig: true,
    customTags: true,
    trainingData: true,
    envInfo: true,
    databaseMgmt: true,
  });

  const toggleSection = (section) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };"""

content = content.replace(
    '  // Super Admin check - only sam.deiter@epicgames.com\n  const isSuperAdmin = currentUser?.email === "sam.deiter@epicgames.com";',
    state_injection
)

# 1. Feature Access
# Replace Header
old_header = '<h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">\n          <Icon name="eye" size={18} />\n          Feature Access Overview\n        </h2>'
new_header = '<h2 onClick={() => toggleSection("featureAccess")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="eye" size={18} /> Feature Access Overview</div>\n          <Icon name={collapsed.featureAccess ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.featureAccess && ('
content = content.replace(old_header, new_header)

# Replace End
old_end = '          </div>\n        </div>\n      </div>\n\n      {/* Create Invite Section */}'
new_end = '          </div>\n        </div>\n        )}\n      </div>\n\n      {/* Create Invite Section */}'
content = content.replace(old_end, new_end)


# 2. Generate Invite
old_header = '<h2 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">\n          <Icon name="mail" size={18} />\n          Generate Invite Code\n        </h2>'
new_header = '<h2 onClick={() => toggleSection("generateInvite")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="mail" size={18} /> Generate Invite Code</div>\n          <Icon name={collapsed.generateInvite ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.generateInvite && ('
content = content.replace(old_header, new_header)

old_end = '        </button>\n      </div>\n\n      {/* Registered Users */}'
new_end = '        </button>\n        )}\n      </div>\n\n      {/* Registered Users */}'
content = content.replace(old_end, new_end)


# 3. Registered Users
old_header = '<h2 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">\n          <Icon name="users" size={18} />\n          Registered Users ({users.length})\n        </h2>'
new_header = '<h2 onClick={() => toggleSection("registeredUsers")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-green-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="users" size={18} /> Registered Users ({users.length})</div>\n          <Icon name={collapsed.registeredUsers ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.registeredUsers && ('
content = content.replace(old_header, new_header)

old_end = '        </div>\n      </div>\n\n      {/* Active Invites */}'
new_end = '        </div>\n        )}\n      </div>\n\n      {/* Active Invites */}'
content = content.replace(old_end, new_end)


# 4. Active Invites
old_header = '<h2 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">\n          <Icon name="key" size={18} />\n          Active Invites ({invites.length})\n        </h2>'
new_header = '<h2 onClick={() => toggleSection("activeInvites")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="key" size={18} /> Active Invites ({invites.length})</div>\n          <Icon name={collapsed.activeInvites ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.activeInvites && ('
content = content.replace(old_header, new_header)

old_end = '        </div>\n      </div>\n\n      {/* API Configuration */}'
new_end = '        </div>\n        )}\n      </div>\n\n      {/* API Configuration */}'
content = content.replace(old_end, new_end)


# 5. API Configuration
old_header = '<h2 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">\n          <Icon name="key" size={18} />\n          API Configuration\n        </h2>'
new_header = '<h2 onClick={() => toggleSection("apiConfig")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="key" size={18} /> API Configuration</div>\n          <Icon name={collapsed.apiConfig ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.apiConfig && ('
content = content.replace(old_header, new_header)

old_end = '        </div>\n      </div>\n\n      {/* Custom Tags */}'
new_end = '        </div>\n        )}\n      </div>\n\n      {/* Custom Tags */}'
content = content.replace(old_end, new_end)


# 6. Custom Tags
old_header = '<h2 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">\n          <Icon name="tag" size={18} />\n          Custom Tags\n        </h2>'
new_header = '<h2 onClick={() => toggleSection("customTags")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="tag" size={18} /> Custom Tags</div>\n          <Icon name={collapsed.customTags ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.customTags && ('
content = content.replace(old_header, new_header)

old_end = '        <TagManager\n          discipline={config.discipline}\n          customTags={customTags || {}}\n          onSaveCustomTags={onSaveCustomTags}\n        />\n      </div>\n\n      {/* Training Data Export - Super Admin Only */}'
new_end = '        <TagManager\n          discipline={config.discipline}\n          customTags={customTags || {}}\n          onSaveCustomTags={onSaveCustomTags}\n        />\n        )}\n      </div>\n\n      {/* Training Data Export - Super Admin Only */}'
content = content.replace(old_end, new_end)


# 7. Training Data (Super Admin)
old_header = '<h2 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">\n            <Icon name="database" size={18} />\n            Vertex AI Training Data\n          </h2>'
new_header = '<h2 onClick={() => toggleSection("trainingData")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">\n            <div className="flex items-center gap-2"><Icon name="database" size={18} /> Vertex AI Training Data</div>\n            <Icon name={collapsed.trainingData ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n          </h2>\n          {!collapsed.trainingData && ('
content = content.replace(old_header, new_header)

old_end = '          <p className="text-[10px] text-slate-500 mt-2 text-center">\n            Exports JSONL format for Vertex AI fine-tuning.\n          </p>\n        </div>\n      )}'
new_end = '          <p className="text-[10px] text-slate-500 mt-2 text-center">\n            Exports JSONL format for Vertex AI fine-tuning.\n          </p>\n          )}\n        </div>\n      )}'
content = content.replace(old_end, new_end)


# 8. Environment Info
old_header = '<h2 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">\n          <Icon name="server" size={18} />\n          Environment Info\n        </h2>'
new_header = '<h2 onClick={() => toggleSection("envInfo")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="server" size={18} /> Environment Info</div>\n          <Icon name={collapsed.envInfo ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.envInfo && ('
content = content.replace(old_header, new_header)

old_end = '        </div>\n      </div>\n\n      {/* Database Management - Super Admin Only */}'
new_end = '        </div>\n        )}\n      </div>\n\n      {/* Database Management - Super Admin Only */}'
content = content.replace(old_end, new_end)


# 9. Database Management (Super Admin)
old_header = '<h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">\n            <Icon name="database" size={18} />\n            Database Management\n          </h2>'
new_header = '<h2 onClick={() => toggleSection("databaseMgmt")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-red-400 mb-3 flex items-center gap-2">\n            <div className="flex items-center gap-2"><Icon name="database" size={18} /> Database Management</div>\n            <Icon name={collapsed.databaseMgmt ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n          </h2>\n          {!collapsed.databaseMgmt && ('
content = content.replace(old_header, new_header)

old_end = '          </div>\n        </div>\n      )}\n    </div>\n  );\n};'
new_end = '          </div>\n          )}\n        </div>\n      )}\n    </div>\n  );\n};'
content = content.replace(old_end, new_end)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Collapsible sections added successfully (Attempt 2)!")
