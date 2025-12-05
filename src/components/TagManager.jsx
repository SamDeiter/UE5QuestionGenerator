import React, { useState } from 'react';
import Icon from './Icon';
import { TAGS_BY_DISCIPLINE } from '../utils/tagTaxonomy';

/**
 * TagManager Component
 * Allows users to create, edit, and delete custom tags for each discipline
 */
const TagManager = ({ discipline, customTags, onSaveCustomTags }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editingTag, setEditingTag] = useState(null);
    const [editValue, setEditValue] = useState('');

    const predefinedTags = TAGS_BY_DISCIPLINE[discipline] || [];
    const userTags = customTags[discipline] || [];

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        
        // Ensure tag starts with #
        const formattedTag = newTag.startsWith('#') ? newTag : `#${newTag}`;
        
        // Check for duplicates
        if (predefinedTags.includes(formattedTag) || userTags.includes(formattedTag)) {
            alert('This tag already exists!');
            return;
        }

        const updatedTags = {
            ...customTags,
            [discipline]: [...userTags, formattedTag]
        };
        
        onSaveCustomTags(updatedTags);
        setNewTag('');
    };

    const handleDeleteTag = (tag) => {
        if (!confirm(`Delete tag "${tag}"?`)) return;

        const updatedTags = {
            ...customTags,
            [discipline]: userTags.filter(t => t !== tag)
        };
        
        onSaveCustomTags(updatedTags);
    };

    const handleEditTag = (tag) => {
        setEditingTag(tag);
        setEditValue(tag);
    };

    const handleSaveEdit = () => {
        if (!editValue.trim()) return;
        
        const formattedTag = editValue.startsWith('#') ? editValue : `#${editValue}`;
        
        // Check for duplicates (excluding the tag being edited)
        if (formattedTag !== editingTag && 
            (predefinedTags.includes(formattedTag) || userTags.includes(formattedTag))) {
            alert('This tag already exists!');
            return;
        }

        const updatedTags = {
            ...customTags,
            [discipline]: userTags.map(t => t === editingTag ? formattedTag : t)
        };
        
        onSaveCustomTags(updatedTags);
        setEditingTag(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingTag(null);
        setEditValue('');
    };

    return (
        <div className="border border-slate-700 rounded-lg bg-slate-900/50 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon name="tag" size={16} />
                    <span className="text-sm font-semibold text-slate-200">
                        Custom Tags for {discipline}
                    </span>
                    {userTags.length > 0 && (
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">
                            {userTags.length} custom
                        </span>
                    )}
                </div>
                <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={16} />
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="px-4 py-3 space-y-4 border-t border-slate-700">
                    {/* Add New Tag */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400">
                            Add New Tag
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTag();
                                    if (e.key === 'Escape') setNewTag('');
                                }}
                                placeholder="e.g., CustomFeature or #CustomFeature"
                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm outline-none focus:border-orange-500"
                            />
                            <button
                                onClick={handleAddTag}
                                disabled={!newTag.trim()}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Icon name="plus" size={14} />
                                Add
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Create custom tags to focus question generation on specific topics
                        </p>
                    </div>

                    {/* User Tags List */}
                    {userTags.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">
                                Your Custom Tags ({userTags.length})
                            </label>
                            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                {userTags.map(tag => (
                                    <div
                                        key={tag}
                                        className="flex items-center gap-2 p-2 bg-slate-800 rounded border border-slate-700 hover:border-slate-600 transition-colors"
                                    >
                                        {editingTag === tag ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                    className="flex-1 px-2 py-1 bg-slate-900 border border-orange-500 rounded text-sm outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="p-1 text-green-400 hover:text-green-300"
                                                    title="Save"
                                                >
                                                    <Icon name="check" size={14} />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1 text-red-400 hover:text-red-300"
                                                    title="Cancel"
                                                >
                                                    <Icon name="x" size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex-1 text-sm text-orange-300">
                                                    {tag}
                                                </span>
                                                <button
                                                    onClick={() => handleEditTag(tag)}
                                                    className="p-1 text-slate-400 hover:text-blue-400"
                                                    title="Edit"
                                                >
                                                    <Icon name="edit" size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTag(tag)}
                                                    className="p-1 text-slate-400 hover:text-red-400"
                                                    title="Delete"
                                                >
                                                    <Icon name="trash-2" size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Predefined Tags Info */}
                    <div className="pt-3 border-t border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase text-slate-400">
                                Predefined Tags ({predefinedTags.length})
                            </label>
                            <span className="text-xs text-slate-500">Read-only</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                            {predefinedTags.map(tag => (
                                <span
                                    key={tag}
                                    className="text-xs px-2 py-1 bg-slate-800/50 border border-slate-700 text-slate-400 rounded"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagManager;
