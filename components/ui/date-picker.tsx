import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
}

const CustomDatePicker: React.FC<DatePickerProps> = ({ selected, onChange, placeholderText }) => {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      placeholderText={placeholderText}
      className="border rounded-md p-2 w-full"
    />
  );
};

export { CustomDatePicker as DatePicker };