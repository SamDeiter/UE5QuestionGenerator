import { TAGS_BY_DISCIPLINE } from '../../utils/tagTaxonomy';
import Icon from '../Icon';

const CoverageGapSuggester = ({ allQuestionsMap, config, handleChange, showMessage, setShowGenSettings }) => {
    // 1. Get stats for the current selected discipline
    const currentDiscipline = config.discipline || 'Technical Art';
    const availableTags = TAGS_BY_DISCIPLINE[currentDiscipline] || [];

    // 2. Count usage
    const tagCounts = {};
    availableTags.forEach(t => tagCounts[t] = 0);

    Object.values(allQuestionsMap).forEach(q => {
        if (q.tags && Array.isArray(q.tags)) {
            q.tags.forEach(t => {
                const norm = t.startsWith('#') ? t : `#${t}`;
                // relaxed matching
                const key = availableTags.find(at => at.toLowerCase() === norm.toLowerCase());
                if (key) tagCounts[key]++;
            });
        }
    });

    // 3. Find gaps (0 questions)
    const zeroCoverageTags = availableTags.filter(t => tagCounts[t] === 0);
    const lowCoverageTags = availableTags.filter(t => tagCounts[t] > 0 && tagCounts[t] < 3);

    // Only show if missing a significant number of topics (User Request: "only ... when you are missing a lot")
    // Threshold set to 4 missing topics
    if (zeroCoverageTags.length < 4) return null;

    const targetTags = zeroCoverageTags.length > 0 ? zeroCoverageTags.slice(0, 3) : lowCoverageTags.slice(0, 3);
    const gapType = zeroCoverageTags.length > 0 ? "Missing Topics" : "Low Coverage";

    const handleTagClick = (tag) => {
        const currentTags = config.tags || [];
        let newTags;
        if (currentTags.includes(tag)) {
            newTags = currentTags.filter(t => t !== tag);
        } else {
            newTags = [...currentTags, tag];
        }
        handleChange({ target: { name: 'tags', value: newTags } });
    };

    const handleAutoFill = () => {
        // Merge tags instead of replacing
        const currentTags = config.tags || [];
        // Use all detected tags instead of just the top 3 visible ones
        const tagsToAdd = zeroCoverageTags.length > 0 ? zeroCoverageTags : lowCoverageTags;
        const newTags = [...new Set([...currentTags, ...tagsToAdd])];
        
        handleChange({ target: { name: 'tags', value: newTags } });
        
        // Provide feedback and open settings so user sees the change
        if (showMessage) showMessage(`Added suggestions: ${targetTags.join(', ')}`, 'success');
        if (setShowGenSettings) setShowGenSettings(true);
    };

    return (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 animate-in fade-in slide-in-from-left-4">
            <div className="flex items-start gap-2">
                <div className="p-1.5 bg-orange-500/20 rounded text-orange-400 mt-0.5">
                    <Icon name="alert-triangle" size={14} />
                </div>
                <div className="flex-1">
                    <h4 className="text-xs font-bold text-orange-200 uppercase tracking-wide mb-1">
                        {gapType} Detected
                    </h4>
                    <p className="text-[10px] text-orange-200/70 mb-2 leading-relaxed">
                        The following areas in <strong>{currentDiscipline}</strong> have {zeroCoverageTags.length > 0 ? 'no' : 'few'} questions:
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                        {targetTags.map(tag => {
                            const isSelected = (config.tags || []).includes(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => handleTagClick(tag)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                        isSelected 
                                            ? 'bg-orange-500 text-white border-orange-600' 
                                            : 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                        {(zeroCoverageTags.length > 3 || lowCoverageTags.length > 3) && (
                            <span className="text-[9px] px-1.5 py-0.5 text-orange-400/70">
                                +{(zeroCoverageTags.length || lowCoverageTags.length) - 3} more
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleAutoFill}
                        className="w-full py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                    >
                        Focus on Suggestions <Icon name="arrow-right" size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CoverageGapSuggester;
