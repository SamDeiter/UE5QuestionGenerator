import React from "react";
import PropTypes from "prop-types";

/**
 * Reusable Card component with standardized styles.
 * Supports polymorphism via the 'as' prop (default: 'div').
 */
const Card = ({
  as: Component = "div",
  children,
  className = "",
  hoverable = false,
  ...props
}) => {
  const baseStyles =
    "bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6";
  const hoverStyles = hoverable
    ? "transition-all duration-300 hover:bg-slate-800/80 hover:shadow-xl cursor-pointer"
    : "";

  return (
    <Component
      className={`${baseStyles} ${hoverStyles} ${className}`}
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
