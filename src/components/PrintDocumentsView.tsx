import React from 'react';
import { CetakDokumenUjian, CetakDokumenUjianProps } from './CetakDokumenUjian';
import { Exam } from '../types';

export interface PrintDocumentsViewProps {
  token: string;
  exams: Exam[];
  defaultDocType?: 'cards' | 'attendance' | 'minutes';
}

export const PrintDocumentsView: React.FC<PrintDocumentsViewProps> = ({
  token,
  exams,
  defaultDocType = 'cards'
}) => {
  return (
    <CetakDokumenUjian
      token={token}
      exams={exams}
      defaultDocType={defaultDocType}
    />
  );
};

export { CetakDokumenUjian };
export default PrintDocumentsView;
