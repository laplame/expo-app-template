import React from 'react';
import RoleGate from '../components/RoleGate';
import UploadPromotionsScreen from './UploadPromotionsScreen';

export default function UploadPromotionsScreenGate() {
  return (
    <RoleGate permission="upload_promotions">
      <UploadPromotionsScreen />
    </RoleGate>
  );
}
