import React from "react";
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";
const base = "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
const sizes: Record<Size,string> = { sm:"text-sm px-3 py-1.5", md:"text-sm px-3.5 py-2", lg:"text-base px-4 py-2.5" };
const variants: Record<Variant,string> = {
  primary:"bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-600 dark:bg-violet-500 dark:hover:bg-violet-600",
  secondary:"bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  ghost:"bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400 dark:text-gray-200 dark:hover:bg-gray-800",
  danger:"bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
  success:"bg-green-600 text-white hover:bg-green-700 focus:ring-green-600",
};
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }> = ({ className="", variant="primary", size="md", ...props }) =>
  <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
