import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const formatPhone = (rawValue: string): string => {
      // Remove all non-digits
      const digits = rawValue.replace(/\D/g, "");
      
      // Limit to 11 digits
      const limited = digits.slice(0, 11);
      
      // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
      if (limited.length === 0) return "";
      if (limited.length <= 2) return `(${limited}`;
      if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
      if (limited.length <= 10) {
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
      }
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: formatted,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";
