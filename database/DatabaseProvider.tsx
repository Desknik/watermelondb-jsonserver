import React from 'react'
import { DatabaseProvider as WatermelonDBProvider } from '@nozbe/watermelondb/DatabaseProvider'
import { database } from './index'

interface DatabaseProviderProps {
  children: React.ReactNode
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  return (
    <WatermelonDBProvider database={database}>
      {children}
    </WatermelonDBProvider>
  )
}


