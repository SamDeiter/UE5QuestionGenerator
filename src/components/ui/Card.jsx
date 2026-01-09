import React from "react";
import PropTypes from "prop-types";

/**
 * Reusable Card component with standardized styles.
 * Supports polymorphism via the 'as' prop (default: 'div').
 */
const Card = ({
  as: Component = "div",
  children,
  color = "slate",
  className = "",
  hoverable = false,
  ...props
}) => {
  const baseStyles =
    "bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6 relative flex flex-col items-center w-full";

  const colorVariants = {
    slate: "",
    orange: "hover:border-orange-500/50 hover:shadow-orange-900/20",
    indigo: "hover:border-indigo-500/50 hover:shadow-indigo-900/20",
    blue: "hover:border-blue-500/50 hover:shadow-blue-900/20",
    emerald: "hover:border-emerald-500/50 hover:shadow-emerald-900/20",
    purple: "hover:border-purple-500/50 hover:shadow-purple-900/20",
  };

  // Automatically determine interactivity if 'as="button"' or 'onClick' is present
  const isInteractive = hoverable || Component === "button" || !!props.onClick;

  const interactiveStyles = isInteractive
    ? `transition-all duration-300 hover:bg-slate-800/80 cursor-pointer group ${colorVariants[color]}`
    : "";

  return (
    <Component
      className={`${baseStyles} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

Card.propTypes = {
  as: PropTypes.elementType,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  hoverable: PropTypes.bool,
};

export default Card;
