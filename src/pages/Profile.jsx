import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setProfile(data)
          setLoading(false)
        })
    } else if (user === null) {
      setLoading(false)
    }
  }, [user])

  let displayName = ''
  if (profile && profile.first_name) {
    displayName = profile.first_name
  }
  if (!displayName && user && user.email) {
    displayName = user.email
  }

  return (
    <div style={{ 
      padding: '2rem',
      fontFamily: 'var(--main-font)'
    }}>
      <h1 style={{
        fontFamily: 'var(--main-font)',
        marginBottom: '2rem',
        color: 'var(--text-color)',
        textAlign: 'center',
      }}>{loading ? '' : displayName ? `${displayName}'s Profile` : 'Profile'}</h1>
    </div>
  )
}

export default Profile 