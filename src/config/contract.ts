import { zeroAddress, type Address } from 'viem'

const deployedAddress = ''
const configuredAddress = import.meta.env.VITE_CLEARSPACE_CONTRACT_ADDRESS
const activeAddress = configuredAddress || deployedAddress

export const isContractConfigured =
  /^0x[a-fA-F0-9]{40}$/.test(activeAddress) &&
  activeAddress.toLowerCase() !== zeroAddress

export const CLEARSPACE_ADDRESS = (
  isContractConfigured ? activeAddress : zeroAddress
) as Address

export const clearspaceAbi = [
  {
    type: 'function', name: 'completeSession',
    inputs: [{ name: 'minutesAmount', type: 'uint16' }], outputs: [], stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'dailyCheckIn', inputs: [], outputs: [], stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'profileOf', inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'profile', type: 'tuple', components: [
      { name: 'sessions', type: 'uint64' },
      { name: 'totalMinutes', type: 'uint64' },
      { name: 'checkIns', type: 'uint64' },
      { name: 'lastCheckInDay', type: 'uint64' },
      { name: 'lastSessionAt', type: 'uint64' },
      { name: 'bestDayMinutes', type: 'uint32' },
      { name: 'currentDayMinutes', type: 'uint32' },
      { name: 'currentFocusDay', type: 'uint64' },
      { name: 'streak', type: 'uint16' },
    ] }], stateMutability: 'view',
  },
  { type: 'function', name: 'globalSessions', inputs: [], outputs: [{ name: '', type: 'uint64' }], stateMutability: 'view' },
] as const
