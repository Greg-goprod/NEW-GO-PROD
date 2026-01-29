/**
 * ============================================
 * EXEMPLES D'UTILISATION DU COMPOSANT TABLE AURA
 * ============================================
 * 
 * Ce fichier contient des exemples d'utilisation du composant Table AURA
 * avec le hook useTableSort pour une gestion facile du tri.
 */

import React, { useState } from 'react';
import { Table } from './Table';
import { useTableSort } from '@/hooks/useTableSort';
import { Edit2, Trash2, Mail, Phone } from 'lucide-react';

// ============================================
// EXEMPLE 1 : Table simple sans tri
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const SimpleTable: React.FC = () => {
  const users: User[] = [
    { id: '1', name: 'Alice Martin', email: 'alice@example.com', role: 'Admin' },
    { id: '2', name: 'Bob Dupont', email: 'bob@example.com', role: 'User' },
  ];

  return (
    <Table>
      <Table.Head>
        <Table.Row hoverable={false}>
          <Table.HeaderCell>Nom</Table.HeaderCell>
          <Table.HeaderCell>Email</Table.HeaderCell>
          <Table.HeaderCell>Rôle</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {users.map((user) => (
          <Table.Row key={user.id}>
            <Table.Cell>{user.name}</Table.Cell>
            <Table.Cell>{user.email}</Table.Cell>
            <Table.Cell>{user.role}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

// ============================================
// EXEMPLE 2 : Table avec tri automatique
// ============================================

export const SortableTable: React.FC = () => {
  const contacts = [
    { id: '1', name: 'Zoe Lavigne', email: 'zoe@example.com', phone: '0612345678' },
    { id: '2', name: 'Alice Martin', email: 'alice@example.com', phone: '0623456789' },
    { id: '3', name: 'Marc Dubois', email: 'marc@example.com', phone: '0634567890' },
  ];

  const { sortedData, handleSort, getSortState } = useTableSort(contacts, 'name', 'asc');

  return (
    <Table>
      <Table.Head>
        <Table.Row hoverable={false}>
          <Table.HeaderCell
            sortable
            sorted={getSortState('name')}
            onClick={() => handleSort('name')}
          >
            Nom
          </Table.HeaderCell>
          <Table.HeaderCell
            sortable
            sorted={getSortState('email')}
            onClick={() => handleSort('email')}
          >
            Email
          </Table.HeaderCell>
          <Table.HeaderCell
            sortable
            sorted={getSortState('phone')}
            onClick={() => handleSort('phone')}
          >
            Téléphone
          </Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {sortedData.map((contact) => (
          <Table.Row key={contact.id}>
            <Table.Cell className="font-medium text-gray-900 dark:text-white">
              {contact.name}
            </Table.Cell>
            <Table.Cell>
              <a 
                href={`mailto:${contact.email}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {contact.email}
              </a>
            </Table.Cell>
            <Table.Cell>{contact.phone}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

// ============================================
// EXEMPLE 3 : Table complète avec actions et alignement
// ============================================

export const FullFeaturedTable: React.FC = () => {
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Alice Martin', email: 'alice@example.com', phone: '0612345678', role: 'Booking Agent' },
    { id: '2', name: 'Bob Dupont', email: 'bob@example.com', phone: '0623456789', role: 'Manager' },
    { id: '3', name: 'Claire Leroy', email: 'claire@example.com', phone: '0634567890', role: 'Tourneur' },
  ]);

  const { sortedData, handleSort, getSortState } = useTableSort(contacts, 'name', 'asc');

  const handleEdit = (id: string) => {
    console.log('Edit:', id);
  };

  const handleDelete = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  return (
    <Table>
      <Table.Head>
        <Table.Row hoverable={false}>
          <Table.HeaderCell
            sortable
            sorted={getSortState('name')}
            onClick={() => handleSort('name')}
          >
            Nom
          </Table.HeaderCell>
          <Table.HeaderCell>Fonction</Table.HeaderCell>
          <Table.HeaderCell
            sortable
            sorted={getSortState('email')}
            onClick={() => handleSort('email')}
          >
            Email
          </Table.HeaderCell>
          <Table.HeaderCell
            sortable
            sorted={getSortState('phone')}
            onClick={() => handleSort('phone')}
          >
            Téléphone
          </Table.HeaderCell>
          <Table.HeaderCell align="right">Actions</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {sortedData.map((contact) => (
          <Table.Row key={contact.id}>
            <Table.Cell>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {contact.name}
              </div>
            </Table.Cell>
            <Table.Cell>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                {contact.role}
              </span>
            </Table.Cell>
            <Table.Cell>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Mail className="w-4 h-4 mr-1" />
                <a href={`mailto:${contact.email}`} className="hover:text-violet-400">
                  {contact.email}
                </a>
              </div>
            </Table.Cell>
            <Table.Cell>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Phone className="w-4 h-4 mr-1" />
                <a href={`https://wa.me/${contact.phone.replace(/\s/g, '')}`} className="hover:text-violet-400">
                  {contact.phone}
                </a>
              </div>
            </Table.Cell>
            <Table.Cell align="right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleEdit(contact.id)}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-2 text-red-500 hover:text-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

// ============================================
// EXEMPLE 4 : Table avec photo et hover cliquable
// ============================================

export const ContactsTableExample: React.FC = () => {
  const contacts = [
    { 
      id: '1', 
      name: 'Alice Martin', 
      email: 'alice@example.com', 
      photo: 'https://i.pravatar.cc/150?img=1',
      role: 'Booking Agent'
    },
    { 
      id: '2', 
      name: 'Bob Dupont', 
      email: 'bob@example.com', 
      photo: null,
      role: 'Manager'
    },
  ];

  const { sortedData, handleSort, getSortState } = useTableSort(contacts, 'name', 'asc');

  const handleRowClick = (id: string) => {
    console.log('Navigate to contact:', id);
  };

  return (
    <Table>
      <Table.Head>
        <Table.Row hoverable={false}>
          <Table.HeaderCell className="w-16">Photo</Table.HeaderCell>
          <Table.HeaderCell
            sortable
            sorted={getSortState('name')}
            onClick={() => handleSort('name')}
          >
            Nom
          </Table.HeaderCell>
          <Table.HeaderCell>Fonction</Table.HeaderCell>
          <Table.HeaderCell
            sortable
            sorted={getSortState('email')}
            onClick={() => handleSort('email')}
          >
            Email
          </Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {sortedData.map((contact) => (
          <Table.Row 
            key={contact.id}
            onClick={() => handleRowClick(contact.id)}
          >
            <Table.Cell>
              {contact.photo ? (
                <img
                  src={contact.photo}
                  alt={contact.name}
                  className="w-10 h-10 rounded-full object-cover border border-violet-500"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm border border-violet-500">
                  {contact.name.split(' ').map(n => n[0]).join('')}
                </div>
              )}
            </Table.Cell>
            <Table.Cell>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {contact.name}
              </div>
            </Table.Cell>
            <Table.Cell>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                {contact.role}
              </span>
            </Table.Cell>
            <Table.Cell>
              <a 
                href={`mailto:${contact.email}`}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-violet-400"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.email}
              </a>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};










