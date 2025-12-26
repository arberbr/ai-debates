/**
 * Type definitions for debate form data
 */

export interface DebateFormData {
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: number;
  judgePrompt: string;
}

/**
 * Type-safe interface for TanStack Form field API
 * This abstracts the complex generic types while maintaining type safety for the properties we use
 */
export interface FormFieldApi<TValue = unknown> {
  state: {
    value: TValue;
  };
  handleChange: (value: TValue | ((prev: TValue) => TValue)) => void;
  handleBlur: () => void;
}

/**
 * Generic form type that accepts any form with Field method
 * This is a simplified type that works with TanStack Form's complex type system
 * while still providing better type safety than using 'unknown'
 */
export type FormWithField = {
  Field: (props: {
    name: string;
    children: (field: FormFieldApi) => React.ReactNode;
  }) => React.ReactNode;
};
