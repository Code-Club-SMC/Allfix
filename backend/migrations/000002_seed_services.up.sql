INSERT INTO services (name, description, icon) VALUES
    ('Electrician',          'Electrical installation, repair, and wiring services',       'zap'),
    ('Plumber',              'Pipe fitting, leakage repair, and plumbing installation',    'droplets'),
    ('Welder',               'Metal welding and fabrication services',                     'flame'),
    ('Carpenter',            'Furniture, cabinetry, and woodwork services',                'hammer'),
    ('Sweeper',              'Deep cleaning and sweeping for homes and offices',           'wind'),
    ('Painter',              'Interior and exterior wall painting services',               'paintbrush'),
    ('Rock Wall',            'Stone and rock wall construction and repair',                'layers'),
    ('Texture & Graphy',     'Decorative wall texture and graphic application',            'palette'),
    ('Tile Works',           'Floor and wall tile installation and repair',                'grid'),
    ('Ceiling Works',        'False ceiling installation and repair',                      'square'),
    ('Appliances Repair',    'Home appliance diagnostics and repair',                      'settings'),
    ('Sofa & Carpet Cleaning','Deep cleaning for upholstery and carpets',                  'sparkles')
ON CONFLICT (name) DO NOTHING;
