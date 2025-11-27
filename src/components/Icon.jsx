import React from 'react';
import * as LucideIcons from 'lucide-react';

const Icon = ({ name, size = 16, className = "" }) => {
    // Convert kebab-case to PascalCase for Lucide component name
    const pascalName = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

    // Access the icon component from the imported object
    // Note: lucide-react exports icons as named exports, so we use the namespace import
    const LucideIcon = LucideIcons[pascalName];

    if (!LucideIcon) {
        console.warn(`Icon "${name}" (mapped to "${pascalName}") not found in lucide-react.`);
        return <span style={{ width: size, height: size, display: 'inline-block' }} />;
    }

    return <LucideIcon size={size} className={className} />;
};

export default Icon;
