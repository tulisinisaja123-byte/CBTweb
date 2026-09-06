import React from 'react';
import { CetakDokumenUjian, CetakDokumenUjianProps } from './CetakDokumenUjian';
import { Exam, User, ClassItem, Subject, AssessmentType, SchoolSettings } from '../types';

export interface PrintDocumentsViewProps {
  token: string;
  exams: Exam[];
  users?: User[];
  classes?: ClassItem[];
  subjects?: Subject[];
  assessmentTypes?: AssessmentType[];
  settings?: SchoolSettings;
  defaultDocType?: 'cards' | 'attendance' | 'minutes';
  currentUser?: User;
}

export const PrintDocumentsView: React.FC<PrintDocumentsViewProps> = ({
  token,
  exams,
  users,
  classes,
  subjects,
  assessmentTypes,
  settings,
  defaultDocType = 'cards',
  currentUser
}) => {
  return (
    <CetakDokumenUjian
      token={token}
      exams={exams}
      users={users}
      classes={classes}
      subjects={subjects}
      assessmentTypes={assessmentTypes}
      settings={settings}
      defaultDocType={defaultDocType}
      currentUser={currentUser}
    />
  );
};

export { CetakDokumenUjian };
export default PrintDocumentsView;
