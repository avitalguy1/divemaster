'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SignupPage() {
  // Name & Auth
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Contact & Demographic
  const [phone, setPhone] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Address
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Emergency Contact
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setErrorMsg('Please complete all required fields (*).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          middleInitial,
          email,
          password,
          phone,
          homePhone,
          birthDate,
          addressLine,
          city,
          stateProvince,
          country,
          postalCode,
          emergencyContact,
          emergencyPhone,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Registration failed');
        setIsLoading(false);
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setErrorMsg('Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-slate-50 to-teal-50 px-4 py-8 text-slate-900 flex items-center justify-center">
      <Card className="w-full max-w-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md rounded-2xl">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-slate-100">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white mb-2 shadow-md shadow-sky-500/20 font-extrabold text-xl">
            DM
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
            PADI DMT Registration
          </CardTitle>
          <CardDescription className="text-slate-500 text-sm font-medium">
            Candidate Information and Evaluation Form Registration
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* Section 1: Account Credentials */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 border-b border-slate-200 pb-1">
                Account Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 text-xs font-semibold">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dmt@diveshop.com"
                    required
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-700 text-xs font-semibold">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Personal Name */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 border-b border-slate-200 pb-1">
                Personal Information
              </h3>
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="first-name" className="text-slate-700 text-xs font-semibold">First Name *</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    required
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="last-name" className="text-slate-700 text-xs font-semibold">Last Name *</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    required
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>

                <div className="col-span-1 space-y-1.5">
                  <Label htmlFor="middle-initial" className="text-slate-700 text-xs font-semibold">M.I.</Label>
                  <Input
                    id="middle-initial"
                    value={middleInitial}
                    onChange={(e) => setMiddleInitial(e.target.value)}
                    placeholder="J"
                    maxLength={2}
                    className="bg-white border-slate-300 text-slate-900 h-10 text-center"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Contact Details & Birth Date */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-slate-700 text-xs font-semibold">Mobile Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="home-phone" className="text-slate-700 text-xs font-semibold">Home Phone</Label>
                  <Input
                    id="home-phone"
                    value={homePhone}
                    onChange={(e) => setHomePhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birth-date" className="text-slate-700 text-xs font-semibold">Birth Date</Label>
                  <Input
                    id="birth-date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Address */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 border-b border-slate-200 pb-1">
                Residential Address
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-slate-700 text-xs font-semibold">Street Address</Label>
                  <Input
                    id="address"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="123 Ocean Drive"
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-slate-700 text-xs font-semibold">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Key West"
                      className="bg-white border-slate-300 text-slate-900 h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-slate-700 text-xs font-semibold">State / Prov</Label>
                    <Input
                      id="state"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder="FL"
                      className="bg-white border-slate-300 text-slate-900 h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-slate-700 text-xs font-semibold">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="USA"
                      className="bg-white border-slate-300 text-slate-900 h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="postal" className="text-slate-700 text-xs font-semibold">Zip / Postal Code</Label>
                    <Input
                      id="postal"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="33040"
                      className="bg-white border-slate-300 text-slate-900 h-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contact */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 border-b border-slate-200 pb-1">
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emergency-contact" className="text-slate-700 text-xs font-semibold">Contact Name</Label>
                  <Input
                    id="emergency-contact"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Jane Smith"
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergency-phone" className="text-slate-700 text-xs font-semibold">Contact Telephone</Label>
                  <Input
                    id="emergency-phone"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="(555) 999-8888"
                    className="bg-white border-slate-300 text-slate-900 h-10"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 shadow-md shadow-sky-600/15 mt-4"
            >
              {isLoading ? 'Registering DMT Candidate...' : 'Submit DMT Registration'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pt-2 pb-6 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">
            Already registered?{' '}
            <Link href="/login" className="text-sky-600 font-bold hover:underline">
              Sign in to your account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
