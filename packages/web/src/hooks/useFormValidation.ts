import { useState, useCallback } from "react";
import { ValidationResult } from "../lib/validation";

interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
}

type ValidationFunction = (value: string) => ValidationResult;

export function useFormValidation(initialValues: Record<string, string>) {
  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const initial: Record<string, FieldState> = {};
    Object.keys(initialValues).forEach((key) => {
      initial[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
      };
    });
    return initial;
  });

  const setValue = useCallback((fieldName: string, value: string) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value,
      },
    }));
  }, []);

  const setError = useCallback((fieldName: string, error: string | null) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        error,
      },
    }));
  }, []);

  const setTouched = useCallback((fieldName: string) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        touched: true,
      },
    }));
  }, []);

  const validate = useCallback(
    (fieldName: string, validationFn: ValidationFunction): boolean => {
      const result = validationFn(fields[fieldName].value);
      setFields((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          error: result.error || null,
          touched: true,
        },
      }));
      return result.isValid;
    },
    [fields]
  );

  const validateAll = useCallback(
    (validations: Record<string, ValidationFunction>): boolean => {
      let isValid = true;
      const newFields = { ...fields };

      Object.keys(validations).forEach((fieldName) => {
        const result = validations[fieldName](fields[fieldName].value);
        newFields[fieldName] = {
          ...newFields[fieldName],
          error: result.error || null,
          touched: true,
        };
        if (!result.isValid) {
          isValid = false;
        }
      });

      setFields(newFields);
      return isValid;
    },
    [fields]
  );

  const reset = useCallback(() => {
    const resetFields: Record<string, FieldState> = {};
    Object.keys(fields).forEach((key) => {
      resetFields[key] = {
        value: "",
        error: null,
        touched: false,
      };
    });
    setFields(resetFields);
  }, [fields]);

  const getFieldProps = useCallback(
    (fieldName: string) => ({
      value: fields[fieldName]?.value || "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setValue(fieldName, e.target.value),
      onBlur: () => setTouched(fieldName),
    }),
    [fields, setValue, setTouched]
  );

  return {
    fields,
    setValue,
    setError,
    setTouched,
    validate,
    validateAll,
    reset,
    getFieldProps,
  };
}
