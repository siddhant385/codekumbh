'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from './ui/button'
import { User, LogOut, ChevronDown, Settings } from 'lucide-react'
import { signOut } from '@/actions/auth/auth'

interface NavLink {
  label: string
  href: string
}

interface NavbarProps {
  companyName: string
  links: NavLink[]
  profileButtonLabel?: string
  onProfileClick?: () => void
}

export default function Navbar({
  companyName,
  links,
  profileButtonLabel = 'Profile',
}: NavbarProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-md dark:bg-slate-900">
      {/* Company Name */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {companyName}
        </h1>
      </div>

      {/* Center Links */}
      <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-medium transition-colors duration-200"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Profile Dropdown */}
      <div className="flex-shrink-0 relative" ref={menuRef}>
        <Button
          variant="outline"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2"
        >
          <User size={16} />
          {profileButtonLabel}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </Button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings size={15} className="text-gray-400" />
              Settings
            </Link>
            <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
            <button
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
