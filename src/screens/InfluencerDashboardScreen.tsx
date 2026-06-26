/**
 * Dashboard influencer — envuelve InfluencerIdentityScreen con gate de rol.
 */
import React from 'react';
import RoleGate from '../components/RoleGate';
import InfluencerIdentityScreen from './InfluencerIdentityScreen';

export default function InfluencerDashboardScreen() {
  return (
    <RoleGate permission="influencer_dashboard">
      <InfluencerIdentityScreen />
    </RoleGate>
  );
}
