"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useId } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string | React.ReactNode;
  errorText?: string;
  required?: boolean;
  rightIcon?: ReactNode;
};

/**
 * Standard text input for ProFormaX web. Reuse this for every form field —
 * login, registration, project cost inputs, chatbot settings, etc. — so
 * labels, error states, and focus rings stay consistent app-wide.
 */
const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, errorText, required, rightIcon, className = "", id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(errorText);

    return (
      <div className="mb-5">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
          {required && <span className="text-clay"> *</span>}
        </label>

        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={`w-full rounded-xl border bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-slate-400
              transition-shadow duration-150
              focus:outline-none focus:shadow-focus
              disabled:cursor-not-allowed disabled:bg-mist disabled:text-slate-400
              ${hasError ? "border-clay" : "border-slate-200"}
              ${rightIcon ? "pr-11" : ""}
              ${className}`}
            {...rest}
          />
          {rightIcon && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </span>
          )}
        </div>

        {hasError && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-clay">
            {errorText}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";
export default TextField;